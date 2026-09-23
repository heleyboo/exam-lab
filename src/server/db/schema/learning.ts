import {
  bigint,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { question, taxonomyNode } from "./content";
import { reportReasonEnum, reportStatusEnum } from "./enums";

/**
 * Độ thành thạo theo từng dạng bài.
 * Lưu ở cấp dạng bài; mức Chủ đề và Chương tính bình quân có trọng số theo số
 * câu, xem src/lib/mastery.ts. Không lưu sẵn các cấp trên để khỏi lệch nhau.
 */
export const mastery = pgTable(
  "mastery",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    typeNodeId: uuid("type_node_id")
      .notNull()
      .references(() => taxonomyNode.id, { onDelete: "cascade" }),
    /** 0–100. Chỉ hiển thị khi đã đủ số câu tối thiểu, tránh nhảy loạn lúc ít dữ liệu. */
    score: real("score").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("mastery_pk_idx").on(table.userId, table.typeNodeId),
    index("mastery_user_idx").on(table.userId, table.score),
  ],
);

/** Người dùng báo lỗi nội dung. SLA xử lý 48 giờ. */
export const contentReport = pgTable("content_report", {
  id: uuid("id").primaryKey().defaultRandom(),
  shortCode: text("short_code").notNull(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => question.id, { onDelete: "cascade" }),
  reportedBy: text("reported_by").references(() => user.id, { onDelete: "set null" }),
  reason: reportReasonEnum("reason").notNull(),
  detail: text("detail"),
  status: reportStatusEnum("status").notNull().default("new"),
  resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Đếm lượt dùng tính năng AI theo ngày.
 * Hết lượt thì chặn trước khi gọi API, không gọi rồi mới báo lỗi.
 */
export const usageQuota = pgTable(
  "usage_quota",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Tên tính năng, ví dụ "essay_grading", "variant_generation". */
    feature: text("feature").notNull(),
    /** Ngày tính theo giờ Việt Nam, dạng YYYY-MM-DD. */
    day: text("day").notNull(),
    used: integer("used").notNull().default(0),
  },
  (table) => [uniqueIndex("usage_quota_pk_idx").on(table.userId, table.feature, table.day)],
);

/** Chi phí và token của từng lần gọi model, gom theo tháng để so với ngân sách. */
export const aiUsageLog = pgTable(
  "ai_usage_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feature: text("feature").notNull(),
    model: text("model").notNull(),
    /** Phiên bản prompt kèm schema, để truy nguyên khi chất lượng đổi. */
    promptVersion: text("prompt_version"),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    costVnd: bigint("cost_vnd", { mode: "number" }).notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    /** Bản ghi liên quan, ví dụ import_job hoặc question. */
    refId: uuid("ref_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("ai_usage_log_created_idx").on(table.createdAt, table.feature)],
);

export const badge = pgTable(
  "badge",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
  },
  (table) => [uniqueIndex("badge_slug_idx").on(table.slug)],
);

export const userBadge = pgTable(
  "user_badge",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    badgeId: uuid("badge_id")
      .notNull()
      .references(() => badge.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("user_badge_pk_idx").on(table.userId, table.badgeId)],
);
