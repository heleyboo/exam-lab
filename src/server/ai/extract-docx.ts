import fs from "node:fs/promises";
import path from "node:path";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PageExtraction } from "../extraction/schema";
import { anthropic } from "./anthropic-client";
import { loadPrompt } from "./prompt";
import { run } from "../extraction/shell";
import type { Usage } from "./cost";

export interface DocxResult {
  extraction: PageExtraction;
  usage: Usage;
  promptVersion: string;
}

/**
 * docx đi đường riêng: pandoc giữ được công thức MathType/OMML dưới dạng LaTeX,
 * sạch hơn hẳn so với render ra ảnh rồi đọc lại bằng vision.
 */
export async function extractDocx(
  docxPath: string,
  outDir: string,
  opts: { model: string },
): Promise<DocxResult> {
  const markdownPath = path.join(outDir, "source.md");
  await fs.mkdir(outDir, { recursive: true });

  await run("pandoc", [
    docxPath,
    "--to", "markdown",
    "--wrap", "none",
    `--extract-media=${path.join(outDir, "media")}`,
    "-o", markdownPath,
  ]);

  const markdown = await fs.readFile(markdownPath, "utf8");
  const prompt = await loadPrompt("extract-docx", PageExtraction);

  const response = await anthropic().messages.parse({
    model: opts.model,
    max_tokens: 32000,
    system: prompt.text,
    messages: [{ role: "user", content: markdown }],
    output_config: { format: zodOutputFormat(PageExtraction) },
  });

  if (!response.parsed_output) {
    throw new Error(`Model trả về dữ liệu không khớp schema (stop_reason=${response.stop_reason})`);
  }

  return {
    extraction: response.parsed_output,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    promptVersion: prompt.version,
  };
}
