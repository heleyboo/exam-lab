import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool } from "./index";
import { question, sourceExam } from "./schema";
import { visibleTo, type Audience } from "./visibility";

/**
 * Test chạy trên Postgres thật (`pnpm infra:up`).
 * Lọc bản quyền là thứ không kiểm được bằng test giả: điều kiện SQL sai kiểu
 * join hay thứ tự NULL chỉ lộ ra khi chạy thật.
 */

const PREFIX = `TEST-VIS-${Date.now()}`;

interface Fixture {
  code: string;
  status: "draft" | "published";
  visibility: "public" | "restricted";
  takenDown: boolean;
  withSource: boolean;
}

const FIXTURES: Fixture[] = [
  { code: "cong-khai", status: "published", visibility: "public", takenDown: false, withSource: true },
  { code: "han-che", status: "published", visibility: "restricted", takenDown: false, withSource: true },
  { code: "chua-duyet", status: "draft", visibility: "public", takenDown: false, withSource: true },
  { code: "da-go", status: "published", visibility: "public", takenDown: true, withSource: true },
  { code: "khong-co-de-nguon", status: "published", visibility: "public", takenDown: false, withSource: false },
];

async function codesVisibleTo(audience: Audience): Promise<string[]> {
  const rows = await db
    .select({ shortCode: question.shortCode })
    .from(question)
    .leftJoin(sourceExam, eq(question.sourceExamId, sourceExam.id))
    .where(visibleTo(audience));
  return rows
    .map((r) => r.shortCode)
    .filter((code) => code.startsWith(PREFIX))
    .map((code) => code.slice(PREFIX.length + 1))
    .sort();
}

beforeAll(async () => {
  for (const fixture of FIXTURES) {
    let sourceExamId: string | null = null;
    if (fixture.withSource) {
      const inserted = await db
        .insert(sourceExam)
        .values({
          shortCode: `${PREFIX}-${fixture.code}`,
          examName: `Đề kiểm thử ${fixture.code}`,
          visibility: fixture.visibility,
          takedownAt: fixture.takenDown ? new Date() : null,
        })
        .returning({ id: sourceExam.id });
      sourceExamId = inserted[0]?.id ?? null;
    }

    await db.insert(question).values({
      shortCode: `${PREFIX}-${fixture.code}`,
      kind: "mcq",
      origin: "import",
      status: fixture.status,
      visibility: fixture.visibility,
      stem: `Câu kiểm thử ${fixture.code}`,
      sourceExamId,
    });
  }
});

afterAll(async () => {
  await db.execute(
    // Xoá theo tiền tố của lần chạy này, không đụng dữ liệu khác trong database.
    `DELETE FROM question WHERE short_code LIKE '${PREFIX}%';
     DELETE FROM source_exam WHERE short_code LIKE '${PREFIX}%';` as never,
  );
  await pool.end();
});

describe("lọc nội dung theo trạng thái và bản quyền", () => {
  it("khách chỉ thấy nội dung công khai đã xuất bản", async () => {
    expect(await codesVisibleTo("public")).toEqual(["cong-khai", "khong-co-de-nguon"]);
  });

  it("người đã đăng nhập thấy thêm nội dung hạn chế", async () => {
    expect(await codesVisibleTo("member")).toEqual(["cong-khai", "han-che", "khong-co-de-nguon"]);
  });

  it("người duyệt thấy cả nội dung chưa duyệt", async () => {
    expect(await codesVisibleTo("reviewer")).toEqual([
      "chua-duyet",
      "cong-khai",
      "han-che",
      "khong-co-de-nguon",
    ]);
  });

  it("nội dung đã gỡ biến mất với tất cả, kể cả người duyệt", async () => {
    for (const audience of ["public", "member", "reviewer"] as const) {
      expect(await codesVisibleTo(audience)).not.toContain("da-go");
    }
  });

  it("câu không gắn đề nguồn vẫn hiện, không bị loại vì join NULL", async () => {
    // Câu do admin tự soạn không có đề nguồn; điều kiện gỡ nội dung phải chấp
    // nhận NULL, nếu không nhóm câu này biến mất khỏi mọi truy vấn.
    expect(await codesVisibleTo("public")).toContain("khong-co-de-nguon");
  });
});
