import fs from "node:fs/promises";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PageExtraction } from "../schema.js";
import { anthropic } from "./anthropic-client.js";
import { loadPrompt } from "./prompt.js";
import { addUsage, type Usage } from "./cost.js";

/** Trần token cho một trang thường. */
const MAX_TOKENS = 16000;
/**
 * Trần cho lần thử lại. Trang bảng đáp án của đề thi thật có thể là lưới
 * 24 mã đề × 22 câu = hơn 500 ô, vượt xa trần của một trang câu hỏi bình thường.
 */
const MAX_TOKENS_RETRY = 48000;

export interface PageResult {
  extraction: PageExtraction;
  usage: Usage;
  durationMs: number;
  /** Đã phải thử lại với trần token cao hơn. */
  retried: boolean;
}

export class PageExtractionError extends Error {
  /**
   * Token đã tiêu kể cả khi trích xuất hỏng.
   * Lần gọi hỏng vẫn bị tính tiền, không ghi nhận thì báo cáo chi phí sẽ thấp hơn thực tế.
   */
  readonly usage: Usage;

  constructor(message: string, usage: Usage) {
    super(message);
    this.name = "PageExtractionError";
    this.usage = usage;
  }
}

export function pagePromptVersion(): Promise<string> {
  return loadPrompt("extract-page", PageExtraction).then((p) => p.version);
}

/** Gửi ảnh một trang cho model và nhận dữ liệu đã validate theo schema. */
export async function extractPage(
  imagePath: string,
  opts: { model: string; pageNumber: number; totalPages: number },
): Promise<PageResult> {
  const prompt = await loadPrompt("extract-page", PageExtraction);
  const imageData = await fs.readFile(imagePath);
  const base64 = imageData.toString("base64");
  const started = Date.now();
  let spent: Usage = { inputTokens: 0, outputTokens: 0 };

  // Dùng create rồi tự parse thay vì messages.parse: khi JSON bị cắt giữa chừng,
  // parse ném exception trước khi đọc được usage, làm mất dấu số tiền đã tiêu
  // và chặn luôn cơ hội thử lại với trần token cao hơn.
  const call = async (maxTokens: number) => {
    const params = {
      model: opts.model,
      max_tokens: maxTokens,
      system: prompt.text,
      messages: [
        {
          role: "user" as const,
          content: [
            {
              type: "image" as const,
              source: { type: "base64" as const, media_type: "image/png" as const, data: base64 },
            },
            {
              type: "text" as const,
              text: `Đây là trang ${opts.pageNumber}/${opts.totalPages} của đề. Trích xuất trang này.`,
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(PageExtraction) },
    };

    // Trần token lớn phải đi qua streaming, SDK từ chối gọi thường vì rủi ro
    // vượt thời gian chờ HTTP.
    const response =
      maxTokens > MAX_TOKENS
        ? await anthropic().messages.stream(params).finalMessage()
        : await anthropic().messages.create(params);
    spent = addUsage(spent, {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed = PageExtraction.safeParse(safeJson(text));
    return { stopReason: response.stop_reason, parsed };
  };

  let result = await call(MAX_TOKENS);
  let retried = false;

  // Trang dày dữ liệu (bảng đáp án nhiều mã đề) chạm trần token và trả về JSON
  // cụt. Thử lại một lần với trần cao hơn thay vì bỏ cả trang, vì lần gọi đầu
  // đã tốn tiền rồi.
  if (!result.parsed.success && result.stopReason === "max_tokens") {
    retried = true;
    try {
      result = await call(MAX_TOKENS_RETRY);
    } catch (error) {
      // Lần gọi đầu đã tiêu tiền rồi, phải báo cáo kể cả khi lần thử lại hỏng.
      throw new PageExtractionError(
        `thử lại với trần ${MAX_TOKENS_RETRY} token cũng hỏng: ` +
          `${error instanceof Error ? error.message : String(error)}`,
        spent,
      );
    }
  }

  if (!result.parsed.success) {
    throw new PageExtractionError(
      `model trả về dữ liệu không khớp schema (stop_reason=${result.stopReason}` +
        `${retried ? `, đã thử lại với trần ${MAX_TOKENS_RETRY} token` : ""})`,
      spent,
    );
  }

  return {
    extraction: result.parsed.data,
    usage: spent,
    durationMs: Date.now() - started,
    retried,
  };
}

/** JSON cụt do chạm trần token là chuyện bình thường ở đây, không phải lỗi bất ngờ. */
function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
