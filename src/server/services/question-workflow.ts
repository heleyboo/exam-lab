import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  question,
  questionAnswerKey,
  questionReview,
  questionSolution,
} from "../db/schema";

/**
 * Chuyển trạng thái câu hỏi.
 *
 * Mọi đường vào việc xuất bản đều phải đi qua đây. Điều kiện xuất bản mà nằm
 * rải rác ở từng màn thì sớm muộn có một màn quên kiểm, và câu chưa có đáp án
 * sẽ lọt ra cho học sinh làm.
 */

export type ReviewOutcome = "approved_clean" | "approved_edited" | "rejected";
export type ReviewEditKind =
  | "boundary"
  | "latex"
  | "options"
  | "answer"
  | "figure"
  | "taxonomy"
  | "other";

export class PublishBlockedError extends Error {
  readonly reasons: string[];
  constructor(reasons: string[]) {
    super(`Chưa đủ điều kiện xuất bản: ${reasons.join("; ")}`);
    this.name = "PublishBlockedError";
    this.reasons = reasons;
  }
}

/**
 * Lý do chưa được xuất bản. Trả về danh sách rỗng nghĩa là đủ điều kiện.
 *
 * Câu tự luận không bắt buộc có đáp án vì nó chấm theo rubric; các loại còn
 * lại thì thiếu đáp án là không chấm được.
 */
export async function publishBlockers(questionId: string): Promise<string[]> {
  const [row] = await db
    .select({ id: question.id, kind: question.kind, duplicateOfId: question.duplicateOfId })
    .from(question)
    .where(eq(question.id, questionId))
    .limit(1);
  if (!row) return ["Không tìm thấy câu hỏi"];

  const reasons: string[] = [];

  if (row.kind !== "essay") {
    const [answer] = await db
      .select({ value: questionAnswerKey.value })
      .from(questionAnswerKey)
      .where(eq(questionAnswerKey.questionId, questionId))
      .limit(1);
    if (!answer?.value?.trim()) reasons.push("chưa có đáp án");
  }

  const [solution] = await db
    .select({ id: questionSolution.id })
    .from(questionSolution)
    .where(
      and(eq(questionSolution.questionId, questionId), eq(questionSolution.status, "approved")),
    )
    .limit(1);
  if (!solution) reasons.push("chưa có lời giải đã duyệt");

  if (row.duplicateOfId) reasons.push("đang bị gắn cờ trùng với câu khác");

  return reasons;
}

/** Ghi nhật ký soát và chuyển câu sang trạng thái tương ứng. */
export async function reviewQuestion(input: {
  questionId: string;
  reviewerId?: string | undefined;
  outcome: ReviewOutcome;
  edits?: readonly ReviewEditKind[];
  note?: string | undefined;
  durationMs?: number | undefined;
}): Promise<{ status: "approved" | "rejected" }> {
  const status = input.outcome === "rejected" ? "rejected" : "approved";

  await db.insert(questionReview).values({
    questionId: input.questionId,
    ...(input.reviewerId ? { reviewerId: input.reviewerId } : {}),
    outcome: input.outcome,
    edits: [...(input.edits ?? [])],
    ...(input.note ? { note: input.note } : {}),
    ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
  });

  await db
    .update(question)
    .set({ status, updatedAt: new Date() })
    .where(eq(question.id, input.questionId));

  return { status };
}

/**
 * Xuất bản câu cho học sinh thấy.
 * Ném lỗi thay vì âm thầm bỏ qua: đây là ranh giới giữa nội dung nháp và nội
 * dung học sinh làm thật.
 */
export async function publishQuestion(questionId: string): Promise<void> {
  const blockers = await publishBlockers(questionId);
  if (blockers.length > 0) throw new PublishBlockedError(blockers);

  await db
    .update(question)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(question.id, questionId));
}

/** Đánh dấu là bản trùng của câu khác, hoặc gỡ cờ trùng khi người duyệt cho rằng khác nhau. */
export async function resolveDuplicate(
  questionId: string,
  decision: { isDuplicate: boolean; ofQuestionId?: string },
): Promise<void> {
  await db
    .update(question)
    .set({
      duplicateOfId: decision.isDuplicate ? (decision.ofQuestionId ?? null) : null,
      // Giữ lại điểm giống để về sau còn biết vì sao từng bị gắn cờ.
      updatedAt: new Date(),
    })
    .where(eq(question.id, questionId));
}
