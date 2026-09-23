-- pgvector phải có trước khi tạo cột vector. Để trong migration để
-- database mới dựng từ số 0 cũng chạy được, không phải bật tay.
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."appeal_status" AS ENUM('new', 'reviewing', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."attempt_mode" AS ENUM('practice', 'exam', 'challenge');--> statement-breakpoint
CREATE TYPE "public"."cognitive_level" AS ENUM('NB', 'TH', 'VD', 'VDC');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'pending_review', 'approved', 'published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."essay_submission_kind" AS ENUM('photo', 'editor');--> statement-breakpoint
CREATE TYPE "public"."import_step" AS ENUM('upload', 'extract', 'classify', 'dedupe', 'await_review');--> statement-breakpoint
CREATE TYPE "public"."job_state" AS ENUM('pending', 'running', 'done', 'error');--> statement-breakpoint
CREATE TYPE "public"."question_kind" AS ENUM('mcq', 'true_false', 'short_answer', 'essay');--> statement-breakpoint
CREATE TYPE "public"."question_origin" AS ENUM('import', 'admin', 'ai_variant', 'student_generated');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('wrong_answer', 'bad_formula', 'wrong_taxonomy', 'duplicate', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('new', 'reviewing', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."solution_origin" AS ENUM('ai', 'admin');--> statement-breakpoint
CREATE TYPE "public"."solution_reject_reason" AS ENUM('wrong_algebra', 'wrong_final_answer', 'missing_condition', 'source_key_wrong');--> statement-breakpoint
CREATE TYPE "public"."taxonomy_level" AS ENUM('exam_track', 'subject', 'grade', 'chapter', 'topic', 'question_type');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'restricted');--> statement-breakpoint
CREATE TABLE "import_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_exam_id" uuid NOT NULL,
	"step" "import_step" DEFAULT 'upload' NOT NULL,
	"state" "job_state" DEFAULT 'pending' NOT NULL,
	"error" text,
	"page_orientations" jsonb,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"short_code" text NOT NULL,
	"kind" "question_kind" NOT NULL,
	"level" "cognitive_level",
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"origin" "question_origin" NOT NULL,
	"visibility" "visibility" DEFAULT 'restricted' NOT NULL,
	"stem" text NOT NULL,
	"type_node_id" uuid,
	"tag_node_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"source_exam_id" uuid,
	"source_page" integer,
	"source_index" integer,
	"source_number" text,
	"embedding" vector(768),
	"duplicate_of_id" uuid,
	"similarity" real,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_answer_key" (
	"question_id" uuid PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"source" text DEFAULT 'inline' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_figure" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"caption" text,
	"page" integer,
	"rect_left" real,
	"rect_top" real,
	"rect_width" real,
	"rect_height" real,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"key" text NOT NULL,
	"text" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_rubric_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"max_points" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_short_answer" (
	"question_id" uuid PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_solution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"content" text NOT NULL,
	"origin" "solution_origin" NOT NULL,
	"model" text,
	"generated_at" timestamp,
	"matches_source_key" boolean,
	"status" "content_status" DEFAULT 'pending_review' NOT NULL,
	"reject_reason" "solution_reject_reason",
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_true_false_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"key" text NOT NULL,
	"text" text NOT NULL,
	"correct" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_exam" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"short_code" text NOT NULL,
	"exam_name" text NOT NULL,
	"school" text,
	"year" integer,
	"subject" text DEFAULT 'toan' NOT NULL,
	"grade" integer,
	"exam_code" text,
	"storage_key" text,
	"file_checksum" text,
	"uploaded_by" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"visibility" "visibility" DEFAULT 'restricted' NOT NULL,
	"takedown_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxonomy_node" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" "taxonomy_level" NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"question_count" integer DEFAULT 0 NOT NULL,
	"suggested_by_ai" boolean DEFAULT false NOT NULL,
	"approved" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_grading" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"points" real NOT NULL,
	"max_points" real NOT NULL,
	"steps" jsonb,
	"comment" text,
	"model" text,
	"advisory" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"mode" "attempt_mode" NOT NULL,
	"exam_session_id" uuid,
	"variant_id" uuid,
	"type_node_id" uuid,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"points" real,
	"max_points" real
);
--> statement-breakpoint
CREATE TABLE "attempt_answer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"position" integer,
	"value" text,
	"is_correct" boolean,
	"points" real,
	"flagged" boolean DEFAULT false NOT NULL,
	"answered_at" timestamp DEFAULT now() NOT NULL,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "essay_submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_answer_id" uuid NOT NULL,
	"kind" "essay_submission_kind" NOT NULL,
	"pages" jsonb,
	"content" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"short_code" text NOT NULL,
	"name" text NOT NULL,
	"blueprint_id" uuid,
	"grade_label" text,
	"school_label" text,
	"duration_minutes" integer DEFAULT 90 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_blueprint" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"note" text,
	"track_node_id" uuid,
	"total_points" real DEFAULT 10 NOT NULL,
	"duration_minutes" integer DEFAULT 90 NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_blueprint_row" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blueprint_id" uuid NOT NULL,
	"topic_node_id" uuid NOT NULL,
	"level" "cognitive_level" NOT NULL,
	"kind" "question_kind" NOT NULL,
	"count" integer NOT NULL,
	"points_per_question" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"opens_at" timestamp,
	"closes_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_variant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"code" text NOT NULL,
	"shuffle_seed" integer NOT NULL,
	"shuffle_questions" boolean DEFAULT true NOT NULL,
	"shuffle_options" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_variant_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"option_order" jsonb
);
--> statement-breakpoint
CREATE TABLE "grading_appeal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grading_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"requested_points" real,
	"reason" text NOT NULL,
	"status" "appeal_status" DEFAULT 'new' NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cost_vnd" bigint NOT NULL,
	"user_id" text,
	"ref_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "content_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"short_code" text NOT NULL,
	"question_id" uuid NOT NULL,
	"reported_by" text,
	"reason" "report_reason" NOT NULL,
	"detail" text,
	"status" "report_status" DEFAULT 'new' NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mastery" (
	"user_id" text NOT NULL,
	"type_node_id" uuid NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_quota" (
	"user_id" text NOT NULL,
	"feature" text NOT NULL,
	"day" text NOT NULL,
	"used" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badge" (
	"user_id" text NOT NULL,
	"badge_id" uuid NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_job" ADD CONSTRAINT "import_job_source_exam_id_source_exam_id_fk" FOREIGN KEY ("source_exam_id") REFERENCES "public"."source_exam"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_type_node_id_taxonomy_node_id_fk" FOREIGN KEY ("type_node_id") REFERENCES "public"."taxonomy_node"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_source_exam_id_source_exam_id_fk" FOREIGN KEY ("source_exam_id") REFERENCES "public"."source_exam"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_duplicate_of_id_question_id_fk" FOREIGN KEY ("duplicate_of_id") REFERENCES "public"."question"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_answer_key" ADD CONSTRAINT "question_answer_key_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_figure" ADD CONSTRAINT "question_figure_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_option" ADD CONSTRAINT "question_option_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_rubric_step" ADD CONSTRAINT "question_rubric_step_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_short_answer" ADD CONSTRAINT "question_short_answer_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_solution" ADD CONSTRAINT "question_solution_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_solution" ADD CONSTRAINT "question_solution_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_true_false_item" ADD CONSTRAINT "question_true_false_item_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_exam" ADD CONSTRAINT "source_exam_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_node" ADD CONSTRAINT "taxonomy_node_parent_id_taxonomy_node_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."taxonomy_node"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_grading" ADD CONSTRAINT "ai_grading_submission_id_essay_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."essay_submission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_exam_session_id_exam_session_id_fk" FOREIGN KEY ("exam_session_id") REFERENCES "public"."exam_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_variant_id_exam_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."exam_variant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_type_node_id_taxonomy_node_id_fk" FOREIGN KEY ("type_node_id") REFERENCES "public"."taxonomy_node"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_answer" ADD CONSTRAINT "attempt_answer_attempt_id_attempt_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_answer" ADD CONSTRAINT "attempt_answer_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essay_submission" ADD CONSTRAINT "essay_submission_attempt_answer_id_attempt_answer_id_fk" FOREIGN KEY ("attempt_answer_id") REFERENCES "public"."attempt_answer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam" ADD CONSTRAINT "exam_blueprint_id_exam_blueprint_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."exam_blueprint"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam" ADD CONSTRAINT "exam_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_blueprint" ADD CONSTRAINT "exam_blueprint_track_node_id_taxonomy_node_id_fk" FOREIGN KEY ("track_node_id") REFERENCES "public"."taxonomy_node"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_blueprint" ADD CONSTRAINT "exam_blueprint_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_blueprint_row" ADD CONSTRAINT "exam_blueprint_row_blueprint_id_exam_blueprint_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."exam_blueprint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_blueprint_row" ADD CONSTRAINT "exam_blueprint_row_topic_node_id_taxonomy_node_id_fk" FOREIGN KEY ("topic_node_id") REFERENCES "public"."taxonomy_node"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_session" ADD CONSTRAINT "exam_session_exam_id_exam_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exam"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_session" ADD CONSTRAINT "exam_session_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_variant" ADD CONSTRAINT "exam_variant_exam_id_exam_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exam"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_variant_item" ADD CONSTRAINT "exam_variant_item_variant_id_exam_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."exam_variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_variant_item" ADD CONSTRAINT "exam_variant_item_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_appeal" ADD CONSTRAINT "grading_appeal_grading_id_ai_grading_id_fk" FOREIGN KEY ("grading_id") REFERENCES "public"."ai_grading"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_appeal" ADD CONSTRAINT "grading_appeal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_appeal" ADD CONSTRAINT "grading_appeal_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_log" ADD CONSTRAINT "ai_usage_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_reported_by_user_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery" ADD CONSTRAINT "mastery_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery" ADD CONSTRAINT "mastery_type_node_id_taxonomy_node_id_fk" FOREIGN KEY ("type_node_id") REFERENCES "public"."taxonomy_node"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_quota" ADD CONSTRAINT "usage_quota_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_badge_id_badge_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_short_code_idx" ON "question" USING btree ("short_code");--> statement-breakpoint
CREATE INDEX "question_status_idx" ON "question" USING btree ("status");--> statement-breakpoint
CREATE INDEX "question_type_node_idx" ON "question" USING btree ("type_node_id");--> statement-breakpoint
CREATE INDEX "question_source_exam_idx" ON "question" USING btree ("source_exam_id");--> statement-breakpoint
CREATE INDEX "question_embedding_idx" ON "question" USING hnsw ("embedding" vector_cosine_ops) WHERE "question"."embedding" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "question_option_key_idx" ON "question_option" USING btree ("question_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "question_rubric_step_idx" ON "question_rubric_step" USING btree ("question_id","position");--> statement-breakpoint
CREATE INDEX "question_solution_status_idx" ON "question_solution" USING btree ("status","matches_source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "question_tf_item_key_idx" ON "question_true_false_item" USING btree ("question_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "source_exam_short_code_idx" ON "source_exam" USING btree ("short_code");--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_node_path_idx" ON "taxonomy_node" USING btree ("path");--> statement-breakpoint
CREATE INDEX "taxonomy_node_parent_idx" ON "taxonomy_node" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "attempt_user_idx" ON "attempt" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_answer_question_idx" ON "attempt_answer" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_short_code_idx" ON "exam" USING btree ("short_code");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_blueprint_row_cell_idx" ON "exam_blueprint_row" USING btree ("blueprint_id","topic_node_id","level","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_session_slug_idx" ON "exam_session" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_variant_code_idx" ON "exam_variant" USING btree ("exam_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_variant_item_pos_idx" ON "exam_variant_item" USING btree ("variant_id","position");--> statement-breakpoint
CREATE INDEX "ai_usage_log_created_idx" ON "ai_usage_log" USING btree ("created_at","feature");--> statement-breakpoint
CREATE UNIQUE INDEX "badge_slug_idx" ON "badge" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "mastery_pk_idx" ON "mastery" USING btree ("user_id","type_node_id");--> statement-breakpoint
CREATE INDEX "mastery_user_idx" ON "mastery" USING btree ("user_id","score");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_quota_pk_idx" ON "usage_quota" USING btree ("user_id","feature","day");--> statement-breakpoint
CREATE UNIQUE INDEX "user_badge_pk_idx" ON "user_badge" USING btree ("user_id","badge_id");