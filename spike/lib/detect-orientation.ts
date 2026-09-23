import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "./anthropic-client.js";
import { run } from "./shell.js";
import { rotateImage } from "./render-pdf.js";
import type { Usage } from "./cost.js";

/**
 * Dò hướng trang.
 *
 * Đoán sai hướng là kiểu lỗi nguy hiểm nhất đo được ở spike: model vẫn đọc
 * được chữ lộn ngược nên không có lỗi nào được ném ra, nhưng đáp án trả về sai
 * ở một số ô. Đo trên đề tốt nghiệp THPT 2025: xoay đúng cho 0 lỗi trên 16 ô
 * kiểm được, xoay sai cho 3 lỗi - và tốn gấp 13 lần tiền.
 *
 * Dùng model nhỏ với ảnh thu nhỏ: việc này chỉ cần nhìn hình dạng dòng chữ,
 * không cần đọc nội dung.
 */

const Orientation = z.object({
  /** Số độ cần xoay THEO CHIỀU KIM ĐỒNG HỒ để chữ dựng đứng đọc được. */
  rotate: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  reason: z.string(),
});

const PROMPT = `Ảnh kèm theo là một trang tài liệu tiếng Việt (đề thi hoặc bảng đáp án) đã được thu nhỏ.

Xác định cần xoay ảnh bao nhiêu độ THEO CHIỀU KIM ĐỒNG HỒ để chữ dựng đứng và đọc được bình thường từ trái sang phải.

- Chữ đã dựng đứng, đọc được bình thường → 0
- Chữ nằm ngang, đầu chữ quay sang TRÁI (phải nghiêng đầu sang phải để đọc) → 90
- Chữ lộn ngược hoàn toàn → 180
- Chữ nằm ngang, đầu chữ quay sang PHẢI (phải nghiêng đầu sang trái để đọc) → 270

Phân biệt 0 với 180 bằng dấu tiếng Việt: dấu sắc, huyền, mũ nằm PHÍA TRÊN thân chữ khi ảnh đúng chiều. Nếu các dấu nằm phía dưới thân chữ thì ảnh đang lộn ngược.

Ghi ngắn gọn vào reason căn cứ đã dùng.`;

export interface OrientationResult {
  rotate: number;
  reason: string;
  usage: Usage;
}

/** Model nhỏ là đủ cho việc này và rẻ hơn model trích xuất khoảng 25 lần. */
export const DEFAULT_ORIENTATION_MODEL = "claude-haiku-4-5";

/**
 * Thu nhỏ ảnh trước khi hỏi: hướng trang nhìn ở kích thước nhỏ vẫn rõ,
 * mà token ảnh giảm mạnh.
 */
async function thumbnail(imagePath: string, outDir: string): Promise<string> {
  const out = path.join(outDir, `thumb-${path.basename(imagePath)}`);
  await fs.mkdir(outDir, { recursive: true });
  await run("magick", [imagePath, "-resize", "700x700>", "-quality", "80", out]);
  return out;
}

/**
 * Dò hướng rồi kiểm lại bằng chính ảnh đã xoay.
 *
 * Model hay nhầm 90 với 270 vì hai chiều nằm ngang trông na ná nhau. Nhưng xoay
 * nhầm chiều thì ảnh thành lộn ngược, mà lộn ngược lại là ca model nhận rất
 * chắc nhờ vị trí dấu tiếng Việt. Vậy nên chỉ cần hỏi lại một lần trên ảnh đã
 * xoay là tự sửa được, thay vì đổi sang model đắt hơn.
 */
export async function detectOrientationVerified(
  imagePath: string,
  opts: { model: string; scratchDir: string },
): Promise<OrientationResult> {
  const first = await detectOrientation(imagePath, opts);
  if (first.rotate === 0) return first;

  const rotated = await rotateImage(
    imagePath,
    path.join(opts.scratchDir, `check-${path.basename(imagePath)}`),
    first.rotate,
  );
  const check = await detectOrientation(rotated, opts);
  const usage = {
    inputTokens: first.usage.inputTokens + check.usage.inputTokens,
    outputTokens: first.usage.outputTokens + check.usage.outputTokens,
  };

  if (check.rotate === 0) return { ...first, usage };

  const total = (first.rotate + check.rotate) % 360;
  return {
    rotate: total,
    reason: `${first.reason} | kiểm lại thấy còn lệch ${check.rotate}°, chốt ${total}°`,
    usage,
  };
}

export async function detectOrientation(
  imagePath: string,
  opts: { model: string; scratchDir: string },
): Promise<OrientationResult> {
  const thumb = await thumbnail(imagePath, opts.scratchDir);
  const data = await fs.readFile(thumb);

  const response = await anthropic().messages.create({
    model: opts.model,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: data.toString("base64") },
          },
          { type: "text", text: PROMPT },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(Orientation) },
  });

  const usage: Usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  let parsed: z.infer<typeof Orientation> | null = null;
  try {
    parsed = Orientation.parse(JSON.parse(text));
  } catch {
    // Dò hướng hỏng thì giữ nguyên ảnh, không được làm hỏng cả lần chạy.
    return { rotate: 0, reason: "không dò được hướng, giữ nguyên ảnh", usage };
  }

  return { rotate: parsed.rotate, reason: parsed.reason, usage };
}
