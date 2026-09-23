import fs from "node:fs/promises";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PageExtraction } from "../schema.js";
import { anthropic } from "./anthropic-client.js";
import { loadPrompt } from "./prompt.js";
import type { Usage } from "./cost.js";

export interface PageResult {
  extraction: PageExtraction;
  usage: Usage;
  durationMs: number;
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
  const started = Date.now();

  const response = await anthropic().messages.parse({
    model: opts.model,
    max_tokens: 16000,
    system: prompt.text,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: imageData.toString("base64") },
          },
          {
            type: "text",
            text: `Đây là trang ${opts.pageNumber}/${opts.totalPages} của đề. Trích xuất trang này.`,
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(PageExtraction) },
  });

  if (!response.parsed_output) {
    throw new Error(
      `model trả về dữ liệu không khớp schema (stop_reason=${response.stop_reason})`,
    );
  }

  return {
    extraction: response.parsed_output,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    durationMs: Date.now() - started,
  };
}
