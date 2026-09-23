import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
const cache = new Map<string, { text: string; version: string }>();

/**
 * Nạp prompt và tính version.
 * Version băm cả nội dung prompt LẪN schema: đổi schema làm kết quả đổi y hệt
 * như đổi câu chữ, nên hai thứ phải cùng nằm trong một mã định danh.
 */
export async function loadPrompt(
  name: "extract-page" | "extract-docx",
  schema: z.ZodType,
): Promise<{ text: string; version: string }> {
  const cached = cache.get(name);
  if (cached) return cached;

  const text = await fs.readFile(path.join(here, "prompts", `${name}.md`), "utf8");
  const schemaShape = JSON.stringify(z.toJSONSchema(schema));
  const version = createHash("sha256").update(text).update(schemaShape).digest("hex").slice(0, 12);

  const loaded = { text, version };
  cache.set(name, loaded);
  return loaded;
}
