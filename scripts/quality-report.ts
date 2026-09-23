import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/server/db";
import { question, questionReview, sourceExam } from "../src/server/db/schema";

/**
 * Báo cáo chất lượng trích xuất, tính từ nhật ký soát đề.
 *
 * Số liệu sinh ra trong lúc người duyệt làm việc bình thường, không phải một
 * lượt chấm riêng: câu duyệt thẳng nghĩa là máy làm đúng, câu phải sửa cho biết
 * máy sai ở khâu nào. Đây là con số cho cổng chặn Phase 1.
 */

const EDIT_LABELS: Record<string, string> = {
  boundary: "Ranh giới câu",
  latex: "Công thức",
  options: "Phương án",
  answer: "Đáp án",
  figure: "Hình",
  taxonomy: "Phân loại",
  other: "Khác",
};

function percent(part: number, total: number): string {
  return total === 0 ? "—" : `${((part / total) * 100).toFixed(1)}%`;
}

async function main(): Promise<void> {
  const rows = await db
    .select({
      examId: sourceExam.id,
      examName: sourceExam.examName,
      questionId: question.id,
      outcome: questionReview.outcome,
      edits: questionReview.edits,
      durationMs: questionReview.durationMs,
    })
    .from(question)
    .leftJoin(questionReview, eq(questionReview.questionId, question.id))
    .leftJoin(sourceExam, eq(question.sourceExamId, sourceExam.id));

  const byExam = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.examName ?? "(không có đề nguồn)";
    byExam.set(key, [...(byExam.get(key) ?? []), row]);
  }

  console.log("BÁO CÁO CHẤT LƯỢNG TRÍCH XUẤT\n");

  for (const [examName, items] of byExam) {
    const total = items.length;
    const reviewed = items.filter((i) => i.outcome !== null);
    const clean = reviewed.filter((i) => i.outcome === "approved_clean").length;
    const edited = reviewed.filter((i) => i.outcome === "approved_edited").length;
    const rejected = reviewed.filter((i) => i.outcome === "rejected").length;

    console.log(`## ${examName}`);
    console.log(`   ${total} câu · đã soát ${reviewed.length} (${percent(reviewed.length, total)})`);

    if (reviewed.length === 0) {
      console.log("   chưa soát câu nào, không có số liệu\n");
      continue;
    }

    // Mẫu số là số câu ĐÃ SOÁT: câu chưa soát không được tính là đúng.
    console.log(`   duyệt thẳng   ${clean}/${reviewed.length}  ${percent(clean, reviewed.length)}`);
    console.log(`   phải sửa      ${edited}/${reviewed.length}  ${percent(edited, reviewed.length)}`);
    console.log(`   từ chối       ${rejected}/${reviewed.length}  ${percent(rejected, reviewed.length)}`);

    const editCounts = new Map<string, number>();
    for (const item of reviewed) {
      for (const edit of item.edits ?? []) {
        editCounts.set(edit, (editCounts.get(edit) ?? 0) + 1);
      }
    }
    if (editCounts.size > 0) {
      console.log("   sai ở khâu:");
      for (const [kind, count] of [...editCounts].sort((a, b) => b[1] - a[1])) {
        console.log(
          `     ${(EDIT_LABELS[kind] ?? kind).padEnd(14)} ${count} câu  ${percent(count, reviewed.length)}`,
        );
      }
    }

    const durations = reviewed
      .map((i) => i.durationMs)
      .filter((d): d is number => d !== null && d > 0);
    if (durations.length > 0) {
      const totalMinutes = durations.reduce((sum, d) => sum + d, 0) / 60000;
      console.log(
        `   thời gian soát: ${totalMinutes.toFixed(1)} phút cho ${durations.length} câu ` +
          `(${(totalMinutes / durations.length).toFixed(1)} phút/câu)`,
      );
      console.log(`   quy ra đề 50 câu: ${((totalMinutes / durations.length) * 50).toFixed(0)} phút · ngưỡng plan 20 phút`);
    }
    console.log();
  }

  await pool.end();
}

main().catch(async (error: unknown) => {
  console.error("Lỗi:", error instanceof Error ? error.message : error);
  await pool.end();
  process.exit(1);
});
