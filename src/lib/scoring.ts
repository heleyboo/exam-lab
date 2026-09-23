/**
 * Chấm điểm bốn loại câu theo cấu trúc đề thi tốt nghiệp THPT từ 2025.
 *
 * Mọi nơi chấm điểm đều phải gọi vào đây. Chấm sai là lỗi tệ nhất của sản phẩm
 * này: học sinh làm đúng bị báo sai, và không ai phát hiện ra cho tới khi có
 * người khiếu nại.
 */

export type QuestionKind = "mcq" | "true_false" | "short_answer" | "essay";
export type CognitiveLevel = "NB" | "TH" | "VD" | "VDC";

/** Phần của đề suy từ loại câu. Đề thi vào 10 chuyên toàn tự luận nên không có phần. */
export const PART_OF_KIND: Record<QuestionKind, "I" | "II" | "III" | null> = {
  mcq: "I",
  true_false: "II",
  short_answer: "III",
  essay: null,
};

/** Điểm mỗi câu theo phần, dùng cho mẫu ma trận THPT 2025. */
export const POINTS_PER_QUESTION: Record<"I" | "II" | "III", number> = {
  I: 0.25,
  II: 1,
  III: 0.5,
};

/**
 * Thang điểm câu Đúng/Sai của Bộ: đúng 1/2/3/4 ý được 0,1/0,25/0,5/1 điểm.
 * Thang này không tuyến tính - đúng 2 ý chỉ được một phần tư điểm chứ không
 * phải một nửa.
 */
export const TRUE_FALSE_LADDER = [0, 0.1, 0.25, 0.5, 1] as const;

export function scoreTrueFalse(
  answer: readonly boolean[],
  correct: readonly boolean[],
): { correctCount: number; points: number } {
  if (correct.length !== 4) {
    throw new Error(`Câu Đúng/Sai phải có đúng 4 ý, đang có ${correct.length}`);
  }
  // Học sinh bỏ trống một ý thì ý đó tính là sai, không tính là đúng.
  const correctCount = correct.reduce(
    (total, expected, index) => total + (answer[index] === expected ? 1 : 0),
    0,
  );
  return { correctCount, points: TRUE_FALSE_LADDER[correctCount] ?? 0 };
}

export function scoreMcq(answer: string | null, correct: string): boolean {
  if (!answer) return false;
  return answer.trim().toUpperCase() === correct.trim().toUpperCase();
}

/**
 * Chuẩn hoá đáp số của câu trả lời ngắn trước khi so sánh.
 *
 * Đề thi in dấu phẩy thập phân kiểu Việt Nam, học sinh có thể gõ dấu chấm;
 * "2", "2,0" và " 2 " là cùng một đáp án. So chuỗi trần sẽ đánh trượt oan.
 */
export function normalizeShortAnswer(value: string): string {
  const cleaned = value.trim().replace(/\s+/gu, "").replace(",", ".");
  const asNumber = Number(cleaned);
  if (cleaned !== "" && Number.isFinite(asNumber)) {
    // Chuẩn hoá về dạng số để 2 và 2.0 và 2.00 bằng nhau.
    return String(asNumber);
  }
  return cleaned.toLowerCase();
}

export function scoreShortAnswer(answer: string | null, correct: string): boolean {
  if (answer === null) return false;
  return normalizeShortAnswer(answer) === normalizeShortAnswer(correct);
}

/** Độ dài tối đa của đáp số theo format THPT 2025. */
export const SHORT_ANSWER_MAX_LENGTH = 4;

export function isValidShortAnswer(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= SHORT_ANSWER_MAX_LENGTH;
}

export interface RubricStep {
  /** Điểm tối đa của bước này. */
  maxPoints: number;
}

export interface RubricAward {
  /** Điểm chấm cho bước tương ứng. */
  points: number;
}

/**
 * Cộng điểm tự luận theo rubric từng bước.
 * Điểm này luôn là điểm tham khảo do AI chấm, không vào bảng xếp hạng.
 */
export function scoreEssay(
  steps: readonly RubricStep[],
  awards: readonly RubricAward[],
): { points: number; maxPoints: number } {
  const maxPoints = steps.reduce((total, step) => total + step.maxPoints, 0);
  const points = steps.reduce((total, step, index) => {
    const awarded = awards[index]?.points ?? 0;
    // Không cho chấm vượt trần của bước, cũng không cho điểm âm.
    return total + Math.min(Math.max(awarded, 0), step.maxPoints);
  }, 0);
  return { points, maxPoints };
}

/** Làm tròn điểm về 2 chữ số thập phân để tránh sai số dấu phẩy động khi cộng dồn. */
export function roundPoints(value: number): number {
  return Math.round(value * 100) / 100;
}
