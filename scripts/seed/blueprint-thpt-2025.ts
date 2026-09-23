/**
 * Mẫu ma trận "Cấu trúc THPT 2025 – Toán".
 *
 * Ba chiều: chủ đề × mức độ × loại câu. Prototype chỉ có hai chiều và gán cứng
 * mỗi mức độ vào một phần, nên không tạo được "Nhận biết dạng Đúng/Sai" hay
 * "Vận dụng cao nhiều lựa chọn". Bảng dưới đây có cả hai ô đó.
 *
 * Mock của prototype còn sai số liệu: cho ra 28 câu và 11,80 điểm. Bản này đúng
 * 22 câu và 10,0 điểm, khớp đề chính thức năm 2025.
 */

import { POINTS_PER_QUESTION } from "../../src/lib/scoring";

export interface BlueprintSeedRow {
  /** slug của nút chủ đề trong cây phân loại. */
  topicSlug: string;
  level: "NB" | "TH" | "VD" | "VDC";
  kind: "mcq" | "true_false" | "short_answer" | "essay";
  count: number;
}

/**
 * Phần I: 12 câu nhiều lựa chọn × 0,25 = 3,0 điểm
 * Phần II: 4 câu Đúng/Sai × 1,0 = 4,0 điểm
 * Phần III: 6 câu trả lời ngắn × 0,5 = 3,0 điểm
 * Tổng: 22 câu, 10,0 điểm
 */
export const THPT_2025_BLUEPRINT: BlueprintSeedRow[] = [
  // Phần I - nhiều lựa chọn, trải đủ bốn mức độ
  { topicSlug: "don-dieu-cuc-tri", level: "NB", kind: "mcq", count: 2 },
  { topicSlug: "tiem-can-do-thi", level: "NB", kind: "mcq", count: 2 },
  { topicSlug: "nguyen-ham", level: "NB", kind: "mcq", count: 1 },
  { topicSlug: "cap-so-cong", level: "NB", kind: "mcq", count: 1 },
  { topicSlug: "mat-phang-duong-thang", level: "TH", kind: "mcq", count: 2 },
  { topicSlug: "mau-so-lieu-ghep-nhom", level: "TH", kind: "mcq", count: 1 },
  { topicSlug: "tich-phan", level: "TH", kind: "mcq", count: 1 },
  { topicSlug: "the-tich-khoi-da-dien", level: "VD", kind: "mcq", count: 1 },
  // Ô mà ma trận hai chiều của prototype không biểu diễn được.
  { topicSlug: "goc-khoang-cach", level: "VDC", kind: "mcq", count: 1 },

  // Phần II - Đúng/Sai, gồm cả mức Nhận biết
  { topicSlug: "don-dieu-cuc-tri", level: "NB", kind: "true_false", count: 1 },
  { topicSlug: "xac-suat-dieu-kien", level: "TH", kind: "true_false", count: 1 },
  { topicSlug: "toa-do-diem-vecto", level: "VD", kind: "true_false", count: 1 },
  { topicSlug: "ung-dung-tich-phan", level: "VD", kind: "true_false", count: 1 },

  // Phần III - trả lời ngắn
  { topicSlug: "gia-tri-lon-nhat-nho-nhat", level: "VD", kind: "short_answer", count: 2 },
  { topicSlug: "the-tich-khoi-chop", level: "VD", kind: "short_answer", count: 1 },
  { topicSlug: "cong-thuc-xac-suat-toan-phan", level: "VD", kind: "short_answer", count: 1 },
  { topicSlug: "tich-phan-doi-bien", level: "VDC", kind: "short_answer", count: 1 },
  { topicSlug: "phuong-trinh-mat-cau", level: "VDC", kind: "short_answer", count: 1 },
];

export function pointsOfKind(kind: BlueprintSeedRow["kind"]): number {
  switch (kind) {
    case "mcq":
      return POINTS_PER_QUESTION.I;
    case "true_false":
      return POINTS_PER_QUESTION.II;
    case "short_answer":
      return POINTS_PER_QUESTION.III;
    case "essay":
      // Đề tự luận (thi vào 10 chuyên) khai điểm riêng cho từng dòng, không có
      // mức mặc định theo phần.
      return 0;
  }
}

export function summarize(rows: readonly BlueprintSeedRow[]): {
  totalQuestions: number;
  totalPoints: number;
} {
  return rows.reduce(
    (acc, row) => ({
      totalQuestions: acc.totalQuestions + row.count,
      totalPoints: acc.totalPoints + row.count * pointsOfKind(row.kind),
    }),
    { totalQuestions: 0, totalPoints: 0 },
  );
}
