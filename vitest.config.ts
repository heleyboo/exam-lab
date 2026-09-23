import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Chỉ chạy test của dự án. Thư mục .claude chứa test của bộ công cụ
    // ClaudeKit, không thuộc mã nguồn ở đây.
    include: ["src/**/*.test.ts", "spike/**/*.test.ts"],
  },
});
