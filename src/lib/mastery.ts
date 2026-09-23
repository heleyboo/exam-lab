/**
 * Độ thành thạo theo dạng bài.
 *
 * Ngưỡng màu 45% và 70% lấy từ prototype và là quyết định sản phẩm, không phải
 * con số kỹ thuật: dưới 45 là cần học lại, trên 70 là đã vững.
 */

export const MASTERY_THRESHOLDS = { weak: 45, strong: 70 } as const;

export type MasteryBand = "weak" | "medium" | "strong";

export function masteryBand(score: number): MasteryBand {
  if (score < MASTERY_THRESHOLDS.weak) return "weak";
  if (score < MASTERY_THRESHOLDS.strong) return "medium";
  return "strong";
}

/** Số câu tối thiểu mới hiển thị phần trăm, tránh nhảy loạn khi mới làm vài câu. */
export const MIN_ATTEMPTS_TO_SHOW = 5;

export function shouldShowMastery(attempts: number): boolean {
  return attempts >= MIN_ATTEMPTS_TO_SHOW;
}

export interface MasteryLeaf {
  /** Điểm thành thạo 0–100 của một dạng bài. */
  score: number;
  /** Số câu đã làm, dùng làm trọng số. */
  attempts: number;
}

/**
 * Gộp độ thành thạo của nhiều dạng bài lên cấp Chủ đề hoặc Chương.
 *
 * Trọng số theo số câu đã làm, không lấy trung bình trần: dạng bài mới làm 1
 * câu không được kéo điểm ngang với dạng đã làm 50 câu.
 */
export function aggregateMastery(leaves: readonly MasteryLeaf[]): {
  score: number;
  attempts: number;
} {
  const attempts = leaves.reduce((total, leaf) => total + leaf.attempts, 0);
  if (attempts === 0) return { score: 0, attempts: 0 };

  const weighted = leaves.reduce((total, leaf) => total + leaf.score * leaf.attempts, 0);
  return { score: weighted / attempts, attempts };
}
