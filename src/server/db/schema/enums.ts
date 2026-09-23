import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Enum dùng tiếng Anh trong database và trong code; nhãn tiếng Việt nằm ở
 * `src/lib/tone.ts` để đổi chữ hiển thị mà không phải migrate database.
 */

/** Bốn loại câu theo cấu trúc đề thi tốt nghiệp THPT từ 2025. */
export const questionKindEnum = pgEnum("question_kind", [
  "mcq",
  "true_false",
  "short_answer",
  "essay",
]);

/** Mức độ nhận thức dùng trong ma trận đề. */
export const cognitiveLevelEnum = pgEnum("cognitive_level", ["NB", "TH", "VD", "VDC"]);

/** Vòng đời nội dung. Học sinh chỉ thấy câu đã `published`. */
export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "pending_review",
  "approved",
  "published",
  "rejected",
]);

/** Nguồn gốc câu hỏi. `student_generated` là câu học sinh tự sinh bằng AI. */
export const questionOriginEnum = pgEnum("question_origin", [
  "import",
  "admin",
  "ai_variant",
  "student_generated",
]);

/**
 * Quyết định bản quyền: đề của Bộ là `public`, đề trường/sở là `restricted`.
 * Câu `restricted` không hiện ở trang công khai và không cho tải file gốc.
 */
export const visibilityEnum = pgEnum("visibility", ["public", "restricted"]);

/** Cấp trong cây phân loại. `exam_track` là gốc để chứa được nhiều kỳ thi. */
export const taxonomyLevelEnum = pgEnum("taxonomy_level", [
  "exam_track",
  "subject",
  "grade",
  "chapter",
  "topic",
  "question_type",
]);

/** Năm bước của job import, khớp thanh tiến trình trên giao diện. */
export const importStepEnum = pgEnum("import_step", [
  "upload",
  "extract",
  "classify",
  "dedupe",
  "await_review",
]);

export const jobStateEnum = pgEnum("job_state", ["pending", "running", "done", "error"]);

export const solutionOriginEnum = pgEnum("solution_origin", ["ai", "admin"]);

/**
 * Lý do từ chối lời giải. Giá trị cuối cho phép người duyệt nói rằng chính đề
 * gốc sai, không phải AI sai.
 */
export const solutionRejectReasonEnum = pgEnum("solution_reject_reason", [
  "wrong_algebra",
  "wrong_final_answer",
  "missing_condition",
  "source_key_wrong",
]);

export const attemptModeEnum = pgEnum("attempt_mode", ["practice", "exam", "challenge"]);

export const essaySubmissionKindEnum = pgEnum("essay_submission_kind", ["photo", "editor"]);

export const appealStatusEnum = pgEnum("appeal_status", ["new", "reviewing", "resolved"]);

export const reportStatusEnum = pgEnum("report_status", ["new", "reviewing", "resolved"]);

export const reportReasonEnum = pgEnum("report_reason", [
  "wrong_answer",
  "bad_formula",
  "wrong_taxonomy",
  "duplicate",
  "other",
]);
