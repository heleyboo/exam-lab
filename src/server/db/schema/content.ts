import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
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
  vector,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import {
  cognitiveLevelEnum,
  contentStatusEnum,
  importStepEnum,
  jobStateEnum,
  questionKindEnum,
  questionOriginEnum,
  solutionOriginEnum,
  solutionRejectReasonEnum,
  reviewEditKindEnum,
  reviewOutcomeEnum,
  taxonomyLevelEnum,
  visibilityEnum,
} from "./enums";

/** Số chiều vector. Đổi model embedding là phải migrate cột này. */
export const EMBEDDING_DIMENSIONS = 768;

/**
 * Cây phân loại: Kỳ thi → Môn → Lớp → Chương → Chủ đề → Dạng bài.
 * Gốc là kỳ thi để chứa được cả THPT 2025 lẫn thi vào 10 chuyên mà không phải
 * migrate về sau.
 */
export const taxonomyNode = pgTable(
  "taxonomy_node",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    level: taxonomyLevelEnum("level").notNull(),
    // Tự tham chiếu: phải chú kiểu AnyPgColumn, nếu không TypeScript báo vòng lặp kiểu.
    parentId: uuid("parent_id").references((): AnyPgColumn => taxonomyNode.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    /** Đường dẫn đầy đủ dạng "thpt-2025/toan/lop-12/...", để lọc cả nhánh bằng một điều kiện. */
    path: text("path").notNull(),
    /** Thứ tự hiển thị giữa các nút cùng cha. */
    position: integer("position").notNull().default(0),
    /** Đếm sẵn số câu đã xuất bản, cập nhật khi nội dung đổi trạng thái. */
    questionCount: integer("question_count").notNull().default(0),
    /** Dạng bài do AI đề xuất phải được admin duyệt trước khi dùng. */
    suggestedByAi: boolean("suggested_by_ai").notNull().default(false),
    approved: boolean("approved").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("taxonomy_node_path_idx").on(table.path),
    index("taxonomy_node_parent_idx").on(table.parentId),
  ],
);

/** Đề gốc đã nạp vào hệ thống, kèm nguồn và trạng thái bản quyền. */
export const sourceExam = pgTable(
  "source_exam",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shortCode: text("short_code").notNull(),
    examName: text("exam_name").notNull(),
    /** Trường hoặc sở ra đề. Bắt buộc ghi để truy được nguồn khi bị khiếu nại bản quyền. */
    school: text("school"),
    year: integer("year"),
    subject: text("subject").notNull().default("toan"),
    grade: integer("grade"),
    /** Mã đề in trên giấy, ví dụ "0101". Một kỳ thi phát nhiều mã. */
    examCode: text("exam_code"),
    storageKey: text("storage_key"),
    fileChecksum: text("file_checksum"),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    status: contentStatusEnum("status").notNull().default("draft"),
    visibility: visibilityEnum("visibility").notNull().default("restricted"),
    /** Có giá trị nghĩa là đã gỡ theo yêu cầu; mọi câu của đề này phải biến mất khỏi truy vấn. */
    takedownAt: timestamp("takedown_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("source_exam_short_code_idx").on(table.shortCode)],
);

/** Tiến trình nạp đề, năm bước khớp thanh tiến trình trên giao diện admin. */
export const importJob = pgTable("import_job", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceExamId: uuid("source_exam_id")
    .notNull()
    .references(() => sourceExam.id, { onDelete: "cascade" }),
  step: importStepEnum("step").notNull().default("upload"),
  state: jobStateEnum("state").notNull().default("pending"),
  error: text("error"),
  /** Hướng xoay đã áp cho từng trang, để truy nguyên khi kết quả đáng ngờ. */
  pageOrientations: jsonb("page_orientations").$type<{ page: number; rotate: number }[]>(),
  warnings: jsonb("warnings").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const question = pgTable(
  "question",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Mã ngắn cho người đọc, ví dụ Q-18452. Dùng khi trao đổi, báo lỗi. */
    shortCode: text("short_code").notNull(),
    kind: questionKindEnum("kind").notNull(),
    level: cognitiveLevelEnum("level"),
    status: contentStatusEnum("status").notNull().default("draft"),
    origin: questionOriginEnum("origin").notNull(),
    /** Kế thừa từ đề nguồn, nhân bản ra đây để truy vấn không phải join. */
    visibility: visibilityEnum("visibility").notNull().default("restricted"),
    /** Đề bài dạng Markdown, công thức bọc trong $...$. */
    stem: text("stem").notNull(),
    /** Dạng bài, là nút lá của cây phân loại. */
    typeNodeId: uuid("type_node_id").references(() => taxonomyNode.id, { onDelete: "set null" }),
    /** Các nhãn phụ ngoài dạng bài chính. */
    tagNodeIds: uuid("tag_node_ids").array().notNull().default(sql`'{}'::uuid[]`),
    sourceExamId: uuid("source_exam_id").references(() => sourceExam.id, { onDelete: "set null" }),
    sourcePage: integer("source_page"),
    sourceIndex: integer("source_index"),
    /** Số câu in trên đề, giữ nguyên chuỗi vì có đề dùng số La Mã. */
    sourceNumber: text("source_number"),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    /** Trỏ tới câu gốc khi người duyệt xác nhận đây là bản trùng. */
    duplicateOfId: uuid("duplicate_of_id").references((): AnyPgColumn => question.id, {
      onDelete: "set null",
    }),
    /** Độ giống với câu gần nhất lúc nhập, để người duyệt biết vì sao bị gắn cờ. */
    similarity: real("similarity"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("question_short_code_idx").on(table.shortCode),
    index("question_status_idx").on(table.status),
    index("question_type_node_idx").on(table.typeNodeId),
    index("question_source_exam_idx").on(table.sourceExamId),
    // HNSW cho tìm câu tương tự. Khoảng cách cosine vì embedding đã chuẩn hoá.
    index("question_embedding_idx")
      .using("hnsw", table.embedding.op("vector_cosine_ops"))
      .where(sql`${table.embedding} IS NOT NULL`),
  ],
);

/** Phương án của câu nhiều lựa chọn. */
export const questionOption = pgTable(
  "question_option",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
  },
  (table) => [uniqueIndex("question_option_key_idx").on(table.questionId, table.key)],
);

/** Bốn ý a–d của câu Đúng/Sai. */
export const questionTrueFalseItem = pgTable(
  "question_true_false_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    text: text("text").notNull(),
    correct: boolean("correct").notNull(),
  },
  (table) => [uniqueIndex("question_tf_item_key_idx").on(table.questionId, table.key)],
);

/** Đáp số của câu trả lời ngắn. So sánh sau khi chuẩn hoá, xem src/lib/scoring.ts. */
export const questionShortAnswer = pgTable("question_short_answer", {
  questionId: uuid("question_id")
    .primaryKey()
    .references(() => question.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
});

/** Rubric chấm tự luận, mỗi dòng là một bước. */
export const questionRubricStep = pgTable(
  "question_rubric_step",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    maxPoints: real("max_points").notNull(),
  },
  (table) => [uniqueIndex("question_rubric_step_idx").on(table.questionId, table.position)],
);

/** Hình của câu, cắt từ ảnh trang theo khung phần trăm. */
export const questionFigure = pgTable("question_figure", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => question.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  caption: text("caption"),
  /** Trang chứa hình. Câu trải hai trang thì hình có thể nằm ở trang sau. */
  page: integer("page"),
  /** Khung theo phần trăm kích thước trang, để zoom và đổi DPI không lệch. */
  rectLeft: real("rect_left"),
  rectTop: real("rect_top"),
  rectWidth: real("rect_width"),
  rectHeight: real("rect_height"),
  position: integer("position").notNull().default(0),
});

/** Đáp án chính thức của câu, tách riêng để kiểm soát quyền đọc. */
export const questionAnswerKey = pgTable("question_answer_key", {
  questionId: uuid("question_id")
    .primaryKey()
    .references(() => question.id, { onDelete: "cascade" }),
  /** mcq: "B" · true_false: "ĐSSĐ" · short_answer: "2,5" · essay: rỗng. */
  value: text("value").notNull(),
  /** Đáp án đọc trực tiếp trên đề, từ bảng đáp án, hay do người duyệt nhập. */
  source: text("source").notNull().default("inline"),
});

/** Lời giải từng bước. Học sinh chỉ thấy khi đã duyệt. */
export const questionSolution = pgTable(
  "question_solution",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    origin: solutionOriginEnum("origin").notNull(),
    /** Model và thời điểm sinh, để truy nguyên khi lời giải sai hàng loạt. */
    model: text("model"),
    generatedAt: timestamp("generated_at"),
    /**
     * Kết luận của lời giải có khớp đáp án gốc không.
     * Lệch thì vào hàng chờ ưu tiên và không bao giờ tự xuất bản.
     */
    matchesSourceKey: boolean("matches_source_key"),
    status: contentStatusEnum("status").notNull().default("pending_review"),
    rejectReason: solutionRejectReasonEnum("reject_reason"),
    reviewedBy: text("reviewed_by").references(() => user.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("question_solution_status_idx").on(table.status, table.matchesSourceKey)],
);

/**
 * Nhật ký soát từng câu.
 *
 * Vừa là dấu vết ai duyệt cái gì, vừa là nguồn số liệu đo chất lượng trích
 * xuất: tỉ lệ câu duyệt thẳng chính là tỉ lệ máy làm đúng, và `edits` cho biết
 * máy sai ở khâu nào.
 */
export const questionReview = pgTable(
  "question_review",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "cascade" }),
    reviewerId: text("reviewer_id").references(() => user.id, { onDelete: "set null" }),
    outcome: reviewOutcomeEnum("outcome").notNull(),
    /** Các khâu phải sửa tay. Rỗng khi duyệt thẳng. */
    edits: reviewEditKindEnum("edits").array().notNull().default(sql`'{}'::review_edit_kind[]`),
    note: text("note"),
    /** Thời gian soát câu này, để đo tốc độ soát thực tế. */
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("question_review_question_idx").on(table.questionId)],
);
