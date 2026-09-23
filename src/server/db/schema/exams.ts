import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { question, taxonomyNode } from "./content";
import {
  appealStatusEnum,
  attemptModeEnum,
  cognitiveLevelEnum,
  essaySubmissionKindEnum,
  questionKindEnum,
} from "./enums";

/**
 * Ma trận đề. Ba chiều: chủ đề × mức độ × loại câu.
 *
 * Prototype chỉ có hai chiều và gán cứng mỗi mức độ vào một phần, nên không tạo
 * được câu "Nhận biết dạng Đúng/Sai" hay "Vận dụng cao nhiều lựa chọn". Cấu
 * trúc phần và điểm mỗi câu thuộc về từng mẫu ma trận, không gán cứng trong
 * code: đề thi vào 10 chuyên toàn tự luận và không chia phần.
 */
export const examBlueprint = pgTable("exam_blueprint", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  note: text("note"),
  /** Nhánh kỳ thi trong cây phân loại, ví dụ "thpt-2025". */
  trackNodeId: uuid("track_node_id").references(() => taxonomyNode.id, { onDelete: "set null" }),
  /** Tổng điểm mong muốn của đề, thường là 10. */
  totalPoints: real("total_points").notNull().default(10),
  durationMinutes: integer("duration_minutes").notNull().default(90),
  /** Mẫu hệ thống dựng sẵn, giáo viên không sửa được mà chỉ nhân bản. */
  isSystem: boolean("is_system").notNull().default(false),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const examBlueprintRow = pgTable(
  "exam_blueprint_row",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blueprintId: uuid("blueprint_id")
      .notNull()
      .references(() => examBlueprint.id, { onDelete: "cascade" }),
    topicNodeId: uuid("topic_node_id")
      .notNull()
      .references(() => taxonomyNode.id, { onDelete: "restrict" }),
    level: cognitiveLevelEnum("level").notNull(),
    kind: questionKindEnum("kind").notNull(),
    count: integer("count").notNull(),
    pointsPerQuestion: real("points_per_question").notNull(),
  },
  (table) => [
    uniqueIndex("exam_blueprint_row_cell_idx").on(
      table.blueprintId,
      table.topicNodeId,
      table.level,
      table.kind,
    ),
  ],
);

export const exam = pgTable(
  "exam",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shortCode: text("short_code").notNull(),
    name: text("name").notNull(),
    blueprintId: uuid("blueprint_id").references(() => examBlueprint.id, { onDelete: "set null" }),
    gradeLabel: text("grade_label"),
    schoolLabel: text("school_label"),
    durationMinutes: integer("duration_minutes").notNull().default(90),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("exam_short_code_idx").on(table.shortCode)],
);

/** Một mã đề đã trộn. Mã in trên giấy bắt đầu từ 101. */
export const examVariant = pgTable(
  "exam_variant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exam.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    /** Hạt giống trộn, để in lại đúng bản cũ khi cần. */
    shuffleSeed: integer("shuffle_seed").notNull(),
    shuffleQuestions: boolean("shuffle_questions").notNull().default(true),
    shuffleOptions: boolean("shuffle_options").notNull().default(true),
  },
  (table) => [uniqueIndex("exam_variant_code_idx").on(table.examId, table.code)],
);

export const examVariantItem = pgTable(
  "exam_variant_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => examVariant.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    /** Thứ tự phương án sau khi trộn, ví dụ ["C","A","D","B"]. */
    optionOrder: jsonb("option_order").$type<string[]>(),
  },
  (table) => [uniqueIndex("exam_variant_item_pos_idx").on(table.variantId, table.position)],
);

/** Link làm bài online kèm lịch mở và đóng. Bắt buộc đăng nhập mới vào được. */
export const examSession = pgTable(
  "exam_session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exam.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    opensAt: timestamp("opens_at"),
    closesAt: timestamp("closes_at"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("exam_session_slug_idx").on(table.slug)],
);

/** Một lần làm bài: luyện tập, làm đề đầy đủ, hoặc thử thách. */
export const attempt = pgTable(
  "attempt",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mode: attemptModeEnum("mode").notNull(),
    examSessionId: uuid("exam_session_id").references(() => examSession.id, {
      onDelete: "set null",
    }),
    variantId: uuid("variant_id").references(() => examVariant.id, { onDelete: "set null" }),
    /** Dạng bài đang luyện, chỉ có với chế độ luyện tập. */
    typeNodeId: uuid("type_node_id").references(() => taxonomyNode.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    submittedAt: timestamp("submitted_at"),
    points: real("points"),
    maxPoints: real("max_points"),
  },
  (table) => [index("attempt_user_idx").on(table.userId, table.startedAt)],
);

export const attemptAnswer = pgTable(
  "attempt_answer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempt.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "restrict" }),
    position: integer("position"),
    /** Bài làm thô: "B" · "ĐSSĐ" · "2,5". Câu tự luận để trống, xem essay_submission. */
    value: text("value"),
    isCorrect: boolean("is_correct"),
    points: real("points"),
    /** Đánh dấu để xem lại, dùng ở chế độ làm đề đầy đủ. */
    flagged: boolean("flagged").notNull().default(false),
    answeredAt: timestamp("answered_at").notNull().defaultNow(),
    /** Thời gian làm câu này, dùng để phát hiện bất thường ở bảng xếp hạng. */
    durationMs: integer("duration_ms"),
  },
  (table) => [uniqueIndex("attempt_answer_question_idx").on(table.attemptId, table.questionId)],
);

/** Bài làm tự luận: ảnh chụp hoặc nội dung gõ trên trình soạn công thức. */
export const essaySubmission = pgTable("essay_submission", {
  id: uuid("id").primaryKey().defaultRandom(),
  attemptAnswerId: uuid("attempt_answer_id")
    .notNull()
    .references(() => attemptAnswer.id, { onDelete: "cascade" }),
  kind: essaySubmissionKindEnum("kind").notNull(),
  /** Với ảnh: danh sách khoá file. Với editor: các dòng LaTeX theo từng bước. */
  pages: jsonb("pages").$type<string[]>(),
  content: text("content"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Kết quả AI chấm tự luận. Luôn là điểm tham khảo, không vào bảng xếp hạng.
 * Giáo viên không quản lý lớp trong MVP nên không có ai chấm tay thay thế.
 */
export const aiGrading = pgTable("ai_grading", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => essaySubmission.id, { onDelete: "cascade" }),
  points: real("points").notNull(),
  maxPoints: real("max_points").notNull(),
  /** Điểm và nhận xét cho từng bước của rubric. */
  steps: jsonb("steps").$type<{ position: number; points: number; comment: string }[]>(),
  comment: text("comment"),
  model: text("model"),
  /** Luôn đúng: điểm do AI chấm chỉ để tham khảo. Cột này để truy vấn không phải nhớ quy ước. */
  advisory: boolean("advisory").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gradingAppeal = pgTable("grading_appeal", {
  id: uuid("id").primaryKey().defaultRandom(),
  gradingId: uuid("grading_id")
    .notNull()
    .references(() => aiGrading.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  requestedPoints: real("requested_points"),
  reason: text("reason").notNull(),
  status: appealStatusEnum("status").notNull().default("new"),
  resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
