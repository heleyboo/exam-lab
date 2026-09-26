"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireRole } from "@/server/auth/session";
import { ROUTE_GROUP_ROLES } from "@/server/auth/roles";
import { db } from "@/server/db";
import { question, questionAnswerKey, questionOption } from "@/server/db/schema";
import {
  resolveDuplicate,
  reviewQuestion,
  type ReviewEditKind,
} from "@/server/services/question-workflow";

/** Người duyệt nội dung gồm cả admin và reviewer. */
const REVIEWERS = ROUTE_GROUP_ROLES.review;

export async function saveQuestion(formData: FormData): Promise<void> {
  await requireRole(REVIEWERS);

  const questionId = String(formData.get("questionId"));
  const stem = String(formData.get("stem") ?? "").trim();
  if (!stem) throw new Error("Đề bài không được để trống");

  await db.update(question).set({ stem, updatedAt: new Date() }).where(eq(question.id, questionId));

  // Đáp án lưu ở bảng riêng và có thể chưa tồn tại khi đề gốc không in đáp án.
  const answer = String(formData.get("answerKey") ?? "").trim();
  if (answer) {
    await db
      .insert(questionAnswerKey)
      .values({ questionId, value: answer, source: "reviewer" })
      .onConflictDoUpdate({
        target: questionAnswerKey.questionId,
        set: { value: answer, source: "reviewer" },
      });

    // Phương án đúng phải khớp lại đáp án vừa sửa.
    const options = await db
      .select({ id: questionOption.id, key: questionOption.key })
      .from(questionOption)
      .where(eq(questionOption.questionId, questionId));
    for (const option of options) {
      await db
        .update(questionOption)
        .set({ isCorrect: option.key.toUpperCase() === answer.toUpperCase() })
        .where(eq(questionOption.id, option.id));
    }
  }

  // Phải truyền đúng mẫu route động. Truyền "/quan-tri/soat-de" thì không khớp
  // trang nào nên màn hình không bao giờ được làm mới, và người soát tưởng nút
  // hỏng rồi bấm lại.
  revalidatePath("/quan-tri/soat-de/[examId]", "page");
}

export async function submitReview(formData: FormData): Promise<void> {
  const user = await requireRole(REVIEWERS);

  const outcome = String(formData.get("outcome"));
  if (outcome !== "approved_clean" && outcome !== "approved_edited" && outcome !== "rejected") {
    throw new Error(`Kết quả soát không hợp lệ: ${outcome}`);
  }

  const edits = formData.getAll("edits").map(String) as ReviewEditKind[];
  const duration = Number(formData.get("durationMs"));

  await reviewQuestion({
    questionId: String(formData.get("questionId")),
    reviewerId: user.id,
    outcome,
    edits,
    note: String(formData.get("note") ?? "").trim() || undefined,
    durationMs: Number.isFinite(duration) && duration > 0 ? duration : undefined,
  });

  // Phải truyền đúng mẫu route động. Truyền "/quan-tri/soat-de" thì không khớp
  // trang nào nên màn hình không bao giờ được làm mới, và người soát tưởng nút
  // hỏng rồi bấm lại.
  revalidatePath("/quan-tri/soat-de/[examId]", "page");
}

export async function markDuplicate(formData: FormData): Promise<void> {
  await requireRole(REVIEWERS);
  const questionId = String(formData.get("questionId"));
  const isDuplicate = formData.get("isDuplicate") === "true";
  const ofQuestionId = String(formData.get("ofQuestionId") ?? "");

  await resolveDuplicate(questionId, {
    isDuplicate,
    ...(isDuplicate && ofQuestionId ? { ofQuestionId } : {}),
  });

  // Phải truyền đúng mẫu route động. Truyền "/quan-tri/soat-de" thì không khớp
  // trang nào nên màn hình không bao giờ được làm mới, và người soát tưởng nút
  // hỏng rồi bấm lại.
  revalidatePath("/quan-tri/soat-de/[examId]", "page");
}
