import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/*.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  // Bảng của pg-boss nằm trong schema riêng do chính nó tạo, drizzle-kit không
  // được đụng vào.
  schemaFilter: ["public"],
});
