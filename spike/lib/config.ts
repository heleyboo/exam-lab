import "dotenv/config";

import type { PreprocessMode } from "../../src/server/extraction/render-pdf";

export type { PreprocessMode };
const PREPROCESS_MODES: PreprocessMode[] = ["auto", "on", "off"];

export interface SpikeConfig {
  model: string;
  dpi: number;
  preprocess: PreprocessMode;
  usdToVnd: number;
}

/** Nguồn giá trị thô: biến môi trường và cờ dòng lệnh đi chung một đường validate. */
export interface RawConfig {
  model?: string | undefined;
  dpi?: string | undefined;
  preprocess?: string | undefined;
  usdToVnd?: string | undefined;
}

function positiveInt(name: string, raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value <= 0 || String(value) !== raw.trim()) {
    throw new Error(`${name} phải là số nguyên dương, đang là '${raw}'`);
  }
  return value;
}

function preprocessMode(raw: string | undefined, fallback: PreprocessMode): PreprocessMode {
  if (raw === undefined) return fallback;
  if (!PREPROCESS_MODES.includes(raw as PreprocessMode)) {
    // Không tự sửa chữ hoa hay lỗi gõ: nhận nhầm rồi chạy im lặng sẽ làm hỏng
    // đúng phép so sánh có/không tiền xử lý mà spike sinh ra để trả lời.
    throw new Error(`preprocess phải là auto | on | off, đang là '${raw}'`);
  }
  return raw as PreprocessMode;
}

/**
 * Cờ dòng lệnh ghi đè biến môi trường, nhưng cả hai đều phải qua cùng bộ kiểm tra.
 */
export function loadConfig(cli: RawConfig = {}): SpikeConfig {
  const env = process.env;
  return {
    model: cli.model ?? env.SPIKE_MODEL ?? "claude-opus-5",
    dpi: positiveInt("dpi", cli.dpi ?? env.SPIKE_DPI, 200),
    preprocess: preprocessMode(cli.preprocess ?? env.SPIKE_PREPROCESS, "auto"),
    usdToVnd: positiveInt("usdToVnd", cli.usdToVnd ?? env.SPIKE_USD_VND, 26_000),
  };
}
