import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/**
 * Khởi tạo muộn: tạo client ở cấp module sẽ ném lỗi ngay khi import,
 * trước cả khi hàm main chạy, nên người dùng chỉ thấy stack trace thay vì
 * hướng dẫn đặt API key.
 */
export function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}
