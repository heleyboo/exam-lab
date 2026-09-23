import { PgBoss } from "pg-boss";

/**
 * Hàng đợi công việc chạy ngay trên Postgres, không cần Redis.
 * Dùng cho job dài: trích xuất đề, sinh lời giải, chấm tự luận, xuất PDF.
 */
export const QUEUES = {
  /** Job mẫu để kiểm tra worker sống, sẽ bỏ khi có job thật ở Phase 5. */
  ping: "ping",
} as const;

export interface JobPayloads {
  ping: { sentAt: string; note: string };
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
): Promise<string | null> {
  const instance = await getBoss();
  return instance.send(queue, data);
}

export async function stopBoss(): Promise<void> {
  if (!boss) return;
  await boss.stop();
  boss = null;
}
