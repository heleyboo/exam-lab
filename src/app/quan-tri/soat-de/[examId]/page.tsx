import { asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireRoleOrRedirect } from "@/server/auth/session";
import { ROUTE_GROUP_ROLES } from "@/server/auth/roles";
import { db } from "@/server/db";
import {
  question,
  questionAnswerKey,
  questionFigure,
  questionOption,
  questionReview,
  questionTrueFalseItem,
  sourceExam,
} from "@/server/db/schema";
import { getSignedReadUrl } from "@/server/storage";
import { EmptyState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { VISIBILITY_TONE } from "@/lib/tone";
import { ProofingWorkspace, type PageView } from "./workspace";
import type { EditorQuestion } from "./question-editor";

/**
 * Màn soát đề. Người duyệt đọc đề gốc và sửa câu đã tách ra, ngay cạnh nhau.
 * Đây cũng là chỗ thu số liệu chất lượng trích xuất: mỗi lần duyệt đều ghi lại
 * câu đó có phải sửa hay không, và sửa ở khâu nào.
 */
export default async function SoatDe({ params }: { params: Promise<{ examId: string }> }) {
  await requireRoleOrRedirect(ROUTE_GROUP_ROLES.review);
  const { examId } = await params;

  const [exam] = await db.select().from(sourceExam).where(eq(sourceExam.id, examId)).limit(1);
  if (!exam) notFound();

  const rows = await db
    .select()
    .from(question)
    .where(eq(question.sourceExamId, examId))
    .orderBy(asc(question.sourceIndex));

  if (rows.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {exam.examName}
        </h1>
        <EmptyState
          className="mt-6"
          title="Đề này chưa có câu nào"
          description="Có thể job nạp đề chưa chạy xong hoặc đã lỗi. Xem lại ở màn Nạp đề."
        />
      </main>
    );
  }

  const ids = rows.map((row) => row.id);
  const [options, tfItems, answers, figures, reviews, duplicates] = await Promise.all([
    db.select().from(questionOption).where(inArray(questionOption.questionId, ids)),
    db.select().from(questionTrueFalseItem).where(inArray(questionTrueFalseItem.questionId, ids)),
    db.select().from(questionAnswerKey).where(inArray(questionAnswerKey.questionId, ids)),
    db.select().from(questionFigure).where(inArray(questionFigure.questionId, ids)),
    db.select().from(questionReview).where(inArray(questionReview.questionId, ids)),
    db
      .select({ id: question.id, shortCode: question.shortCode })
      .from(question)
      .where(
        inArray(
          question.id,
          rows.map((row) => row.duplicateOfId).filter((id): id is string => id !== null),
        ),
      ),
  ]);

  const duplicateCodes = new Map(duplicates.map((row) => [row.id, row.shortCode]));

  // Ảnh trang và ảnh hình nằm trong bucket riêng tư nên phải ký hạn đọc.
  const questions: EditorQuestion[] = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      shortCode: row.shortCode,
      kind: row.kind,
      stem: row.stem,
      answerKey: answers.find((a) => a.questionId === row.id)?.value ?? "",
      sourcePage: row.sourcePage,
      sourceNumber: row.sourceNumber,
      status: row.status,
      options: options
        .filter((o) => o.questionId === row.id)
        .map((o) => ({ key: o.key, text: o.text, isCorrect: o.isCorrect })),
      trueFalseItems: tfItems
        .filter((t) => t.questionId === row.id)
        .map((t) => ({ key: t.key, text: t.text, correct: t.correct })),
      figureUrls: await Promise.all(
        figures
          .filter((f) => f.questionId === row.id)
          .map((f) => getSignedReadUrl(f.storageKey, 900)),
      ),
      duplicate:
        row.similarity !== null
          ? {
              shortCode: row.duplicateOfId ? (duplicateCodes.get(row.duplicateOfId) ?? "?") : "?",
              similarity: row.similarity,
              flagged: row.duplicateOfId !== null,
            }
          : null,
      reviewed: reviews.some((r) => r.questionId === row.id),
    })),
  );

  // Khung câu trên ảnh trang: dựng từ khung hình đã lưu, vì đó là toạ độ duy
  // nhất hiện có. Khung cho cả câu sẽ thêm khi lưu được toạ độ vùng câu.
  const pageNumbers = [...new Set(rows.map((row) => row.sourcePage).filter((p): p is number => p !== null))].sort(
    (a, b) => a - b,
  );
  const pages: PageView[] = await Promise.all(
    pageNumbers.map(async (page) => ({
      page,
      imageUrl: await getSignedReadUrl(
        `source-exams/${examId}/pages/page-${String(page).padStart(3, "0")}.png`,
        900,
      ),
      boxes: figures
        .filter((figure) => figure.page === page)
        .map((figure) => ({
          id: figure.questionId,
          label: rows.find((row) => row.id === figure.questionId)?.shortCode ?? "",
          left: figure.rectLeft ?? 0,
          top: figure.rectTop ?? 0,
          width: figure.rectWidth ?? 0,
          height: figure.rectHeight ?? 0,
        })),
    })),
  );

  const reviewed = questions.filter((q) => q.reviewed).length;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Soát đề</p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            {exam.examName}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-2)]">
            {exam.school ?? "Không rõ nguồn"} · {exam.year ?? "—"} · mã đề {exam.examCode ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={VISIBILITY_TONE[exam.visibility].tone}>
            {VISIBILITY_TONE[exam.visibility].label}
          </Badge>
          <Badge tone={reviewed === questions.length ? "ok" : "warn"}>
            Đã soát {reviewed}/{questions.length}
          </Badge>
        </div>
      </header>

      <ProofingWorkspace pages={pages} questions={questions} />
    </main>
  );
}
