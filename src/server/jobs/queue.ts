import { PgBoss } from "pg-boss";

/**
 * Hàng đợi công việc chạy ngay trên Postgres, không cần Redis.
 * Dùng cho job dài: trích xuất đề, sinh lời giải, chấm tự luận, xuất PDF.
 */
export const QUEUES = {
  /** Job mẫu để kiểm tra worker còn sống. */
  ping: "ping",
  /** Nạp một đề từ file vào kho câu hỏi. */
  importExam: "import-exam",
} as const;

export interface JobPayloads {
  ping: { sentAt: string; note: string };
  importExam: {
    jobId: string;
    sourceExamId: string;
    /** File đã lưu tạm trên đĩa của worker. */
    filePath: string;
    examCode?: string;
    skipDedupe?: boolean;
  };
}

let boss: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Thiếu DATABASE_URL. Xem .env.example.");

  boss = new PgBoss(connectionString);
  boss.on("error", (error) => console.error("[pg-boss]", error));
  await boss.start();

  // pg-boss 12 yêu cầu khai báo hàng đợi trước khi gửi job vào.
  for (const name of Object.values(QUEUES)) {
    await boss.createQueue(name);
  }
  return boss;
}

export async function sendJob<K extends keyof JobPayloads>(
  queue: K,
  data: JobPayloads[K],
): Promise<string> {
  const instance = await getBoss();
  // Phải tra sang TÊN hàng đợi. Gửi thẳng tên khoá thì pg-boss không tìm thấy
  // hàng đợi và trả về null, job biến mất mà không có lỗi nào.
  const jobId = await instance.send(QUEUES[queue], data);
  if (!jobId) {
    throw new Error(`Không xếp được job vào hàng đợi '${QUEUES[queue]}'`);
  }
  return jobId;
}

export async function stopBoss(): Promise<void> {
  if (!boss) return;
  await boss.stop();
  boss = null;
}
