import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Chỉ chạy test của dự án. Thư mục .claude chứa test của bộ công cụ
    // ClaudeKit, không thuộc mã nguồn ở đây.
    include: ["src/**/*.test.ts", "spike/**/*.test.ts"],
    // Test tích hợp cần DATABASE_URL; nạp .env như khi chạy thật.
    setupFiles: ["dotenv/config"],
  },
});
