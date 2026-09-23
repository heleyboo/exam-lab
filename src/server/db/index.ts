import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Một pool dùng chung cho cả web app lẫn worker.
 * pg-boss cũng cắm vào cùng database này nên không cần thêm hạ tầng hàng đợi riêng.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Thiếu DATABASE_URL. Xem .env.example.");
}

export const pool = new Pool({ connectionString });
// Phải truyền schema vào: thiếu nó thì Better Auth không ánh xạ được bảng và
// báo "schema mismatch" dù bảng đã có trong database.
export const db = drizzle(pool, { schema });
export type Database = typeof db;
