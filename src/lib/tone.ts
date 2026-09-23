/**
 * Từ điển trạng thái: enum trong database → nhãn tiếng Việt + màu.
 *
 * Lấy nguyên từ prototype. Để ở một chỗ vì đây là ngữ nghĩa nghiệp vụ chứ
 * không phải style: "Lệch đáp án" phải luôn màu đỏ ở mọi màn, không thể mỗi
 * nơi tự chọn.
 */

export type Tone = "ok" | "warn" | "bad" | "accent" | "ai" | "muted";

export interface ToneLabel {
  label: string;
  tone: Tone;
}

/** Vòng đời nội dung. */
export const CONTENT_STATUS_TONE = {
  draft: { label: "Nháp", tone: "muted" },
  pending_review: { label: "Chờ duyệt", tone: "warn" },
  approved: { label: "Đã duyệt", tone: "ok" },
  published: { label: "Đã xuất bản", tone: "ok" },
  rejected: { label: "Từ chối", tone: "bad" },
} as const satisfies Record<string, ToneLabel>;

/** Nguồn gốc câu hỏi. Nội dung do AI sinh luôn mang màu tím riêng. */
export const QUESTION_ORIGIN_TONE = {
  import: { label: "Import", tone: "accent" },
  admin: { label: "Admin", tone: "muted" },
  ai_variant: { label: "AI biến thể", tone: "ai" },
  student_generated: { label: "AI – chưa kiểm duyệt", tone: "ai" },
} as const satisfies Record<string, ToneLabel>;

export const QUESTION_KIND_LABEL = {
  mcq: "Nhiều lựa chọn",
  true_false: "Đúng/Sai",
  short_answer: "Trả lời ngắn",
  essay: "Tự luận",
} as const;

export const COGNITIVE_LEVEL_LABEL = {
  NB: "Nhận biết",
  TH: "Thông hiểu",
  VD: "Vận dụng",
  VDC: "Vận dụng cao",
} as const;

/** Trạng thái lời giải trong hàng chờ duyệt. */
export const SOLUTION_MATCH_TONE = {
  matches: { label: "Khớp đáp án gốc", tone: "ok" },
  mismatches: { label: "Lệch đáp án gốc", tone: "bad" },
} as const satisfies Record<string, ToneLabel>;

/** Bước của job import. */
export const JOB_STATE_TONE = {
  pending: { label: "Chờ xử lý", tone: "muted" },
  running: { label: "Đang xử lý", tone: "accent" },
  done: { label: "Hoàn tất", tone: "ok" },
  error: { label: "Lỗi", tone: "bad" },
} as const satisfies Record<string, ToneLabel>;

export const VISIBILITY_TONE = {
  public: { label: "Công khai", tone: "ok" },
  restricted: { label: "Hạn chế", tone: "warn" },
} as const satisfies Record<string, ToneLabel>;

/** Trạng thái xử lý báo lỗi và khiếu nại. */
export const CASE_STATUS_TONE = {
  new: { label: "Mới", tone: "warn" },
  reviewing: { label: "Đang xem", tone: "accent" },
  resolved: { label: "Đã xử lý", tone: "ok" },
} as const satisfies Record<string, ToneLabel>;

/** Lớp CSS của từng tông màu, dùng chung cho nhãn và chip. */
export const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-[var(--color-ok-soft)] text-[var(--color-ok)]",
  warn: "bg-[var(--color-warn-soft)] text-[var(--color-warn)]",
  bad: "bg-[var(--color-bad-soft)] text-[var(--color-bad)]",
  accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
  ai: "bg-[var(--color-ai-soft)] text-[var(--color-ai)]",
  muted: "bg-[var(--color-surface-2)] text-[var(--color-ink-3)]",
};
