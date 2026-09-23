import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "../../src/server/db";
import { taxonomyNode, examBlueprint, examBlueprintRow } from "../../src/server/db/schema";
import { MATH_TAXONOMY, type TaxonomySeedNode } from "./taxonomy-math";
import { pointsOfKind, summarize, THPT_2025_BLUEPRINT } from "./blueprint-thpt-2025";

/**
 * Seed chạy lại được nhiều lần: đã có thì bỏ qua, không tạo trùng.
 * Cây phân loại là dữ liệu nền, không phải dữ liệu mẫu để xoá đi.
 */

const LEVELS = ["exam_track", "subject", "grade", "chapter", "topic", "question_type"] as const;
type Level = (typeof LEVELS)[number];

async function upsertNode(
  node: TaxonomySeedNode,
  depth: number,
  parentId: string | null,
  parentPath: string,
): Promise<{ created: number; bySlug: Map<string, string> }> {
  const level = LEVELS[depth];
  if (!level) throw new Error(`Cây phân loại sâu quá ${LEVELS.length} cấp tại '${node.slug}'`);

  const path = parentPath ? `${parentPath}/${node.slug}` : node.slug;
  const existing = await db
    .select({ id: taxonomyNode.id })
    .from(taxonomyNode)
    .where(eq(taxonomyNode.path, path))
    .limit(1);

  let id = existing[0]?.id;
  let created = 0;
  if (!id) {
    const inserted = await db
      .insert(taxonomyNode)
      .values({ level: level as Level, parentId, name: node.name, slug: node.slug, path })
      .returning({ id: taxonomyNode.id });
    id = inserted[0]?.id;
    created = 1;
  }
  if (!id) throw new Error(`Không tạo được nút '${path}'`);

  const bySlug = new Map<string, string>([[node.slug, id]]);
  for (const child of node.children ?? []) {
    const result = await upsertNode(child, depth + 1, id, path);
    created += result.created;
    for (const [slug, childId] of result.bySlug) bySlug.set(slug, childId);
  }
  return { created, bySlug };
}

async function seedBlueprint(bySlug: Map<string, string>, trackNodeId: string): Promise<void> {
  const name = "Cấu trúc THPT 2025 – Toán";
  const existing = await db
    .select({ id: examBlueprint.id })
    .from(examBlueprint)
    .where(eq(examBlueprint.name, name))
    .limit(1);
  if (existing[0]) {
    console.log(`  mẫu ma trận đã có, bỏ qua`);
    return;
  }

  const { totalQuestions, totalPoints } = summarize(THPT_2025_BLUEPRINT);
  // Chặn ngay tại chỗ: mẫu sai tổng điểm thì mọi đề sinh ra từ nó đều sai.
  if (Math.abs(totalPoints - 10) > 0.001) {
    throw new Error(`Mẫu ma trận phải đúng 10,0 điểm, đang là ${totalPoints}`);
  }

  const inserted = await db
    .insert(examBlueprint)
    .values({
      name,
      note: `${totalQuestions} câu · Phần I/II/III · 10,0 điểm · 90 phút`,
      trackNodeId,
      totalPoints,
      durationMinutes: 90,
      isSystem: true,
    })
    .returning({ id: examBlueprint.id });

  const blueprintId = inserted[0]?.id;
  if (!blueprintId) throw new Error("Không tạo được mẫu ma trận");

  for (const row of THPT_2025_BLUEPRINT) {
    const topicNodeId = bySlug.get(row.topicSlug);
    if (!topicNodeId) {
      throw new Error(`Mẫu ma trận trỏ tới chủ đề '${row.topicSlug}' không có trong cây phân loại`);
    }
    await db.insert(examBlueprintRow).values({
      blueprintId,
      topicNodeId,
      level: row.level,
      kind: row.kind,
      count: row.count,
      pointsPerQuestion: pointsOfKind(row.kind),
    });
  }
  console.log(`  mẫu ma trận: ${totalQuestions} câu · ${totalPoints} điểm · ${THPT_2025_BLUEPRINT.length} dòng`);
}

async function main(): Promise<void> {
  console.log("Seed cây phân loại Toán THPT...");
  const { created, bySlug } = await upsertNode(MATH_TAXONOMY, 0, null, "");
  console.log(`  tạo mới ${created} nút · tổng ${bySlug.size} nút trong cây`);

  const trackNodeId = bySlug.get(MATH_TAXONOMY.slug);
  if (!trackNodeId) throw new Error("Không tìm thấy nút gốc kỳ thi");

  console.log("Seed mẫu ma trận đề...");
  await seedBlueprint(bySlug, trackNodeId);

  await pool.end();
  console.log("Xong.");
}

main().catch(async (error: unknown) => {
  console.error("Seed lỗi:", error instanceof Error ? error.message : error);
  await pool.end();
  process.exit(1);
});
