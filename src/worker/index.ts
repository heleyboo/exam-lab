import "dotenv/config";
import { getBoss, QUEUES, stopBoss, type JobPayloads } from "../server/jobs/queue";
import { runImport } from "../server/services/import-exam";

/**
 * Worker chạy như một process riêng nhưng dùng chung mã trong src/server.
 * Job trích xuất đề mất hàng chục giây tới vài phút nên không thể chạy trong
 * vòng đời request của web app.
 */
async function main(): Promise<void> {
  const boss = await getBoss();
  console.log("[worker] đã kết nối hàng đợi, đang chờ job...");

  // pg-boss 12 đưa handler MỘT MẢNG job, không phải một job lẻ - đã kiểm chứng
  // bằng cách chạy thật, tài liệu ghi khác.
  await boss.work<JobPayloads["ping"]>(QUEUES.ping, async (jobs) => {
    for (const job of jobs) {
      console.log(`[worker] ping ${job.id} · gửi lúc ${job.data.sentAt} · ${job.data.note}`);
    }
  });

  // Nạp đề mất hàng chục giây tới vài phút nên chỉ chạy một job một lúc, tránh
  // vài job cùng gọi model làm vỡ hạn mức.
  await boss.work<JobPayloads["importExam"]>(
    QUEUES.importExam,
    { batchSize: 1 },
    async (jobs) => {
      for (const job of jobs) {
        console.log(`[worker] nạp đề ${job.data.sourceExamId}...`);
        const result = await runImport({
          jobId: job.data.jobId,
          sourceExamId: job.data.sourceExamId,
          filePath: job.data.filePath,
          examCode: job.data.examCode,
          ...(job.data.skipDedupe !== undefined ? { skipDedupe: job.data.skipDedupe } : {}),
        });
        console.log(`[worker] xong: ${result.questionCount} câu`);
      }
    },
  );

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[worker] nhận ${signal}, đang dừng...`);
    await stopBoss();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error: unknown) => {
  console.error("[worker] lỗi:", error instanceof Error ? error.message : error);
  process.exit(1);
});
