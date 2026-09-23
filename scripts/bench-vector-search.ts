import "dotenv/config";
import { pool } from "../src/server/db";
import { EMBEDDING_DIMENSIONS } from "../src/server/db/schema/content";

/**
 * Đo tốc độ tìm câu tương tự bằng pgvector.
 *
 * Vector ở đây sinh ngẫu nhiên: mục đích là đo tốc độ của index HNSW theo số
 * bản ghi, không phải đo chất lượng phát hiện trùng. Chất lượng chỉ đo được
 * bằng câu hỏi thật, làm ở Phase 5.
 *
 * Ngưỡng của plan: dưới 100ms với 10.000 câu.
 */

const COUNT = Number(process.argv[2] ?? 10_000);
const PREFIX = "BENCH-VEC";

function randomUnitVector(): number[] {
  const values = Array.from({ length: EMBEDDING_DIMENSIONS }, () => Math.random() * 2 - 1);
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  return values.map((v) => v / norm);
}

async function main(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM question WHERE short_code LIKE '${PREFIX}%'`);

    console.log(`Nạp ${COUNT.toLocaleString("vi-VN")} câu với vector ${EMBEDDING_DIMENSIONS} chiều...`);
    const insertStart = Date.now();
    const BATCH = 500;
    for (let offset = 0; offset < COUNT; offset += BATCH) {
      const size = Math.min(BATCH, COUNT - offset);
      const values: string[] = [];
      const params: unknown[] = [];
      for (let i = 0; i < size; i++) {
        const base = i * 3;
        values.push(`($${base + 1}, 'mcq', 'import', $${base + 2}, $${base + 3}::vector)`);
        params.push(`${PREFIX}-${offset + i}`, `Câu đo tốc độ số ${offset + i}`, JSON.stringify(randomUnitVector()));
      }
      await client.query(
        `INSERT INTO question (short_code, kind, origin, stem, embedding) VALUES ${values.join(",")}`,
        params,
      );
    }
    console.log(`  nạp xong trong ${((Date.now() - insertStart) / 1000).toFixed(1)}s`);

    const total = await client.query(`SELECT count(*)::int AS n FROM question WHERE embedding IS NOT NULL`);
    console.log(`  tổng câu có vector trong bảng: ${total.rows[0].n.toLocaleString("vi-VN")}`);

    // Chạy vài lần rồi lấy trung vị: lần đầu luôn chậm vì index chưa vào cache.
    const probe = JSON.stringify(randomUnitVector());
    const durations: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      await client.query(
        `SELECT short_code, 1 - (embedding <=> $1::vector) AS similarity
         FROM question
         WHERE embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT 10`,
        [probe],
      );
      durations.push(performance.now() - start);
    }
    durations.sort((a, b) => a - b);
    const median = durations[Math.floor(durations.length / 2)] ?? 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] ?? 0;

    console.log(`\nTìm 10 câu gần nhất:`);
    console.log(`  trung vị ${median.toFixed(1)}ms · p95 ${p95.toFixed(1)}ms · nhanh nhất ${durations[0]?.toFixed(1)}ms`);
    console.log(`  ngưỡng của plan: dưới 100ms → ${median < 100 ? "ĐẠT" : "CHƯA ĐẠT"}`);

    await client.query(`DELETE FROM question WHERE short_code LIKE '${PREFIX}%'`);
    console.log(`\nĐã xoá dữ liệu đo.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (error: unknown) => {
  console.error("Lỗi:", error instanceof Error ? error.message : error);
  await pool.end();
  process.exit(1);
});
