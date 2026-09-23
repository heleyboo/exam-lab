import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, isNotNull } from "drizzle-orm";
import { db, pool } from "../db";
import { question } from "../db/schema";
import { embedQuestion } from "../ai/embedding";
import { findMostSimilar, verdictFor, DUPLICATE_THRESHOLDS } from "./dedupe";

/**
 * Test chạy trên kho câu hỏi thật đã nạp (`pnpm db:seed` và một lần nạp đề).
 * Ngưỡng phát hiện trùng hiệu chỉnh từ dữ liệu thật, nên phải kiểm lại cũng
 * bằng dữ liệu thật: số liệu tổng hợp không thay được phép thử này.
 */

let existing: { id: string; stem: string } | null = null;
let other: { id: string; stem: string } | null = null;

beforeAll(async () => {
  const rows = await db
    .select({ id: question.id, stem: question.stem })
    .from(question)
    .where(isNotNull(question.embedding))
    .limit(20);
  existing = rows[0] ?? null;
  // Lấy câu ở cuối danh sách để chắc chắn khác chủ đề với câu đầu.
  other = rows.at(-1) ?? null;
});

afterAll(async () => {
  await pool.end();
});

describe("phát hiện câu trùng", () => {
  it("ngưỡng phân loại đúng ba mức", () => {
    expect(verdictFor(0.99)).toBe("duplicate");
    expect(verdictFor(DUPLICATE_THRESHOLDS.duplicate)).toBe("duplicate");
    expect(verdictFor(0.96)).toBe("review");
    expect(verdictFor(0.9)).toBe("unique");
    // Cặp câu KHÁC nhau cao nhất đo được là 0,947 nên mức này phải là "unique".
    expect(verdictFor(0.947)).toBe("unique");
  });

  it("câu chép lại có sửa cách viết bị nhận ra là trùng", async () => {
    if (!existing) return expect.unreachable("Kho chưa có câu nào có vector");

    // Tình huống thật: hai đề dùng lại một câu, chỉ khác cách gõ công thức
    // hoặc vài từ nối. Đây mới là "trùng" theo nghĩa nghiệp vụ.
    const edited = existing.stem.replace(/\$/gu, "").replace("Cho", "Cho biết");
    const vector = await embedQuestion(edited);
    const similar = await findMostSimilar(vector);

    expect(similar).not.toBeNull();
    expect(similar!.questionId).toBe(existing.id);
    expect(similar!.verdict).toBe("duplicate");
  }, 120_000);

  it("câu thêm hẳn một điều kiện mới thì báo cần kiểm tra, không tự gắn cờ trùng", async () => {
    if (!existing) return expect.unreachable("Kho chưa có câu nào có vector");

    // Thêm điều kiện vào đề toán có thể làm nó thành câu khác hẳn, nên để
    // người duyệt quyết thay vì máy tự kết luận.
    const vector = await embedQuestion(`${existing.stem} Biết rằng tham số là số nguyên dương.`);
    const similar = await findMostSimilar(vector);

    expect(similar?.verdict).not.toBe("unique");
  }, 120_000);

  it("câu khác chủ đề không bị gắn cờ trùng", async () => {
    if (!other) return expect.unreachable("Kho chưa có đủ câu");

    const vector = await embedQuestion(
      "Một người gửi tiết kiệm 100 triệu đồng với lãi suất 6% một năm. Hỏi sau 5 năm được bao nhiêu?",
    );
    const similar = await findMostSimilar(vector);

    // Có thể tìm ra câu gần nhất, nhưng không được coi là trùng.
    if (similar) expect(similar.verdict).toBe("unique");
  }, 120_000);

  it("bỏ qua chính các câu vừa nhập khi so sánh", async () => {
    if (!existing) return expect.unreachable("Kho chưa có câu nào có vector");

    const vector = await embedQuestion(existing.stem);
    const similar = await findMostSimilar(vector, { excludeQuestionIds: [existing.id] });

    // Một đề có thể có hai câu na ná nhau mà vẫn hợp lệ, nên câu cùng lần nhập
    // không được tính là bản trùng của nhau.
    expect(similar?.questionId).not.toBe(existing.id);
  }, 120_000);
});
