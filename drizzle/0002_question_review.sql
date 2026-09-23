CREATE TYPE "public"."review_edit_kind" AS ENUM('boundary', 'latex', 'options', 'answer', 'figure', 'taxonomy', 'other');--> statement-breakpoint
CREATE TYPE "public"."review_outcome" AS ENUM('approved_clean', 'approved_edited', 'rejected');--> statement-breakpoint
CREATE TABLE "question_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"reviewer_id" text,
	"outcome" "review_outcome" NOT NULL,
	"edits" "review_edit_kind"[] DEFAULT '{}'::review_edit_kind[] NOT NULL,
	"note" text,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question_review" ADD CONSTRAINT "question_review_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_review" ADD CONSTRAINT "question_review_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "question_review_question_idx" ON "question_review" USING btree ("question_id");