import { extractPage, type PageResult } from "./extract-page";
import { detectOrientationVerified } from "../extraction/detect-orientation";
import { costOf, type Usage } from "./cost";
import type { OrientationResult } from "../extraction/detect-orientation";

/**
 * Một cửa duy nhất để gọi model.
 *
 * Mọi tính năng AI đều đi qua đây để: đổi model không phải sửa rải rác, và mỗi
 * lần gọi đều ghi được token cùng chi phí. Chi phí không đo được thì hạn mức và
 * ngân sách chỉ là con số trang trí.
 */

export type AiFeature =
  | "page_extraction"
  | "orientation"
  | "taxonomy_suggestion"
  | "solution_generation"
  | "essay_grading";

/** Model mặc định cho từng tính năng. Phase 12 cho admin đổi trong màn cài đặt. */
export const DEFAULT_MODELS: Record<AiFeature, string> = {
  page_extraction: "claude-opus-5",
  // Dò hướng chỉ cần nhìn hình dạng dòng chữ nên model nhỏ là đủ và rẻ hơn 25 lần.
  orientation: "claude-haiku-4-5",
  taxonomy_suggestion: "claude-opus-5",
  solution_generation: "claude-opus-5",
  essay_grading: "claude-opus-5",
};

export function modelFor(feature: AiFeature): string {
  const override = process.env[`AI_MODEL_${feature.toUpperCase()}`];
  return override ?? DEFAULT_MODELS[feature];
}

export interface AiCall<T> {
  result: T;
  feature: AiFeature;
  model: string;
  usage: Usage;
  costVnd: number;
  promptVersion?: string;
}

function usdToVnd(): number {
  const raw = Number(process.env.AI_USD_VND ?? 26_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 26_000;
}

function wrap<T>(feature: AiFeature, model: string, usage: Usage, result: T): AiCall<T> {
  return { result, feature, model, usage, costVnd: costOf(model, usage, usdToVnd()).vnd };
}

/** Trích xuất một trang đề thành dữ liệu có cấu trúc. */
export async function aiExtractPage(
  imagePath: string,
  opts: { pageNumber: number; totalPages: number; examCode?: string | undefined },
): Promise<AiCall<PageResult["extraction"]> & { retried: boolean }> {
  const model = modelFor("page_extraction");
  const result = await extractPage(imagePath, { model, ...opts });
  return { ...wrap("page_extraction", model, result.usage, result.extraction), retried: result.retried };
}

/**
 * Dò hướng trang trước khi trích xuất.
 * Hướng sai không gây lỗi nào mà chỉ lặng lẽ trả về dữ liệu sai, nên không thể
 * để người dùng tự đoán.
 */
export async function aiDetectOrientation(
  imagePath: string,
  scratchDir: string,
): Promise<AiCall<OrientationResult>> {
  const model = modelFor("orientation");
  const result = await detectOrientationVerified(imagePath, { model, scratchDir });
  return wrap("orientation", model, result.usage, result);
}
