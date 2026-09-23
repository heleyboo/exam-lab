import "dotenv/config";
import { getBoss, QUEUES, stopBoss, type JobPayloads } from "../server/jobs/queue";

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
