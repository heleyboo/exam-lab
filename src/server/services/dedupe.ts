import { sql } from "drizzle-orm";
import { db } from "../db";
import { EMBEDDING_MODEL_NAME } from "../ai/embedding";

/**
 * Phát hiện câu trùng bằng khoảng cách vector.
 *
 * Ngưỡng dưới đây HIỆU CHỈNH TỪ DỮ LIỆU THẬT, không lấy theo con số quen thuộc.
 * Đo trên 35 câu trích từ đề tốt nghiệp THPT 2025 và tuyển tập Lam Sơn,
 * tổng 595 cặp:
 *
 *   câu khác nhau, cùng một đề : trung vị 0,829 · cao nhất 0,947
 *   câu khác nhau, khác đề     : trung vị 0,830 · cao nhất 0,897
 *   bản trùng có sửa chữ chút  : 0,986 · 0,994 · 0,994
 *
 * Model e5 nén dải cosine lại: hai câu chẳng liên quan gì vẫn đạt 0,83. Vì vậy
 * ngưỡng 0,85 trong kế hoạch ban đầu sẽ báo động giả trên quá nửa số cặp, còn
 * ngưỡng 0,95 thì quá sát mức cao nhất của các cặp KHÁC nhau.
 *
 * Đổi model embedding là phải đo lại toàn bộ, ngưỡng này không mang sang được.
 */
export const DUPLICATE_THRESHOLDS = {
  /** Từ mức này coi như trùng, tự gắn cờ cho người duyệt xử lý. */
  duplicate: 0.98,
  /** Từ mức này tới mức trên: đáng ngờ, hiện cảnh báo nhưng không tự gắn cờ. */
  review: 0.95,
} as const;

export const CALIBRATION_NOTE = `Đo trên 595 cặp câu thật với model ${EMBEDDING_MODEL_NAME}`;

export type DuplicateVerdict = "duplicate" | "review" | "unique";

export function verdictFor(similarity: number): DuplicateVerdict {
  if (similarity >= DUPLICATE_THRESHOLDS.duplicate) return "duplicate";
  if (similarity >= DUPLICATE_THRESHOLDS.review) return "review";
  return "unique";
}

export interface SimilarQuestion {
  questionId: string;
  shortCode: string;
  similarity: number;
  verdict: DuplicateVerdict;
}

/**
 * Tìm câu giống nhất đã có trong kho.
 * Bỏ qua chính câu đang xét và các câu cùng lần nhập, vì một đề có thể có hai
 * câu na ná nhau mà vẫn là hai câu hợp lệ.
 */
export async function findMostSimilar(
  embedding: readonly number[],
  opts: { excludeQuestionIds?: readonly string[] } = {},
): Promise<SimilarQuestion | null> {
  const exclude = opts.excludeQuestionIds ?? [];
  const vector = JSON.stringify(embedding);

  const rows = await db.execute<{ id: string; short_code: string; similarity: number }>(sql`
    SELECT id, short_code, 1 - (embedding <=> ${vector}::vector) AS similarity
    FROM question
    WHERE embedding IS NOT NULL
      ${exclude.length > 0 ? sql`AND id <> ALL(${sql.raw(`ARRAY[${exclude.map((id) => `'${id}'`).join(",")}]::uuid[]`)})` : sql``}
    ORDER BY embedding <=> ${vector}::vector
    LIMIT 1
  `);

  const best = rows.rows[0];
  if (!best) return null;

  const similarity = Number(best.similarity);
  return {
    questionId: best.id,
    shortCode: best.short_code,
    similarity,
    verdict: verdictFor(similarity),
  };
}
