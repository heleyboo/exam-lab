import fs from "node:fs/promises";
import path from "node:path";
import { formatVnd } from "../src/server/ai/cost";
import { Label, LabelFile, MergedQuestion, RunMeta, type SourceKind } from "../src/server/extraction/schema";

/**
 * Chấm chất lượng trích xuất.
 * Không có cách tự động đáng tin để biết một câu tách đúng hay sai, nên người
 * soát đánh dấu tay vào labels.json; script này chỉ tổng hợp và so với ngưỡng.
 *
 * Nguyên tắc: mẫu số là số câu THỰC SỰ có trên đề, không phải số câu model trả về.
 * Lấy mẫu số theo model thì câu bị bỏ sót sẽ vô hình và không bao giờ kéo điểm xuống.
 */

const THRESHOLDS = {
  boundaryDigital: 90,
  boundaryScanTarget: 80,
  boundaryScanFloor: 60,
  latex: 85,
  figure: 70,
  costPerPageVnd: 3000,
};

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Không tìm thấy ${path.relative(process.cwd(), file)}`);
    }
    throw new Error(`${path.relative(process.cwd(), file)} không phải JSON hợp lệ`);
  }
}

async function loadRun(outDir: string): Promise<{ meta: RunMeta; labels: LabelFile }> {
  const meta = RunMeta.parse(await readJson(path.join(outDir, "meta.json")));
  const labels = LabelFile.parse(await readJson(path.join(outDir, "labels.json")));

  // labels.json gắn với một lần chạy cụ thể: chấm bản cũ rồi báo cáo cho bản mới
  // là cách âm thầm nhất để tạo ra một con số không mô tả lần chạy nào.
  if (
    labels.boundTo.promptVersion !== meta.promptVersion ||
    labels.boundTo.extractedAt !== meta.extractedAt ||
    labels.boundTo.questionCount !== meta.questionCount
  ) {
    throw new Error(
      `labels.json thuộc về lần chạy khác (prompt ${labels.boundTo.promptVersion}, ` +
        `${labels.boundTo.questionCount} câu, ${labels.boundTo.extractedAt}) ` +
        `còn meta.json là prompt ${meta.promptVersion}, ${meta.questionCount} câu, ${meta.extractedAt}.\n` +
        `Xoá labels.json rồi chấm lại, hoặc chạy lại extract vào thư mục khác.`,
    );
  }
  return { meta, labels };
}

/** Tạo labels.json để người soát điền tay. */
async function buildLabels(outDir: string): Promise<void> {
  const meta = RunMeta.parse(await readJson(path.join(outDir, "meta.json")));
  const questions = MergedQuestion.array().parse(await readJson(path.join(outDir, "questions.json")));
  const labelsPath = path.join(outDir, "labels.json");

  const exists = await fs.stat(labelsPath).then(() => true, () => false);
  if (exists) {
    throw new Error(`${path.relative(process.cwd(), labelsPath)} đã tồn tại. Xoá nếu muốn tạo lại.`);
  }

  const file: LabelFile = {
    boundTo: {
      source: meta.source,
      promptVersion: meta.promptVersion,
      extractedAt: meta.extractedAt,
      questionCount: meta.questionCount,
    },
    expectedQuestionCount: null,
    rows: questions.map((question, index) => ({
      index: index + 1,
      number: question.number,
      kind: question.kind,
      preview: question.stem.replace(/\s+/g, " ").slice(0, 90),
      croppedFigures: question.figureFiles.length,
      expectedFigures: null,
      boundaryOk: null,
      kindOk: null,
      latexOk: null,
      figureOk: null,
      answerOk: null,
      note: "",
    })),
  };

  await fs.writeFile(labelsPath, JSON.stringify(file, null, 2));
  console.log(`Đã tạo ${path.relative(process.cwd(), labelsPath)} với ${file.rows.length} câu.`);
  console.log("\nCần điền:");
  console.log("  expectedQuestionCount - đếm tay tổng số câu THỰC SỰ có trên đề gốc (bắt buộc)");
  console.log("  expectedFigures       - số hình câu đó thực sự có (0 nếu không có hình)");
  console.log("  boundaryOk            - tách đúng ranh giới, không dính câu khác, không mất phần nào");
  console.log("  kindOk                - nhận đúng loại câu");
  console.log("  latexOk               - công thức đúng, không sai ký hiệu toán");
  console.log("  figureOk              - hình gắn đúng câu và cắt đủ (null nếu câu không có hình)");
  console.log("  answerOk              - đáp án khớp đề gốc (null nếu đề không in đáp án)");
  if (meta.warnings.length > 0) {
    console.log(`\n${meta.warnings.length} cảnh báo trong meta.json - soi các câu này trước.`);
  }
  console.log(`\nChấm xong: pnpm spike:score ${path.relative(process.cwd(), outDir)}`);
}

interface Rate {
  pct: number;
  ok: number;
  total: number;
}

function rateOver(rows: Label[], pick: (l: Label) => boolean | null, denominator: number): Rate {
  const ok = rows.filter((l) => pick(l) === true).length;
  return { pct: denominator > 0 ? (ok / denominator) * 100 : Number.NaN, ok, total: denominator };
}

interface Scored {
  meta: RunMeta;
  labels: LabelFile;
  expected: number;
  boundary: Rate;
  kind: Rate;
  latex: Rate;
  figure: Rate;
  answer: Rate;
  missing: number;
  spurious: number;
}

function scoreRun(meta: RunMeta, labels: LabelFile): Scored {
  const rows = labels.rows;
  if (rows.length === 0) throw new Error(`${meta.source}: labels.json không có câu nào để chấm`);

  const expected = labels.expectedQuestionCount;
  if (expected === null || expected <= 0) {
    throw new Error(
      `${meta.source}: chưa điền expectedQuestionCount trong labels.json. ` +
        `Không có tổng số câu thật thì không biết model bỏ sót bao nhiêu, mọi tỉ lệ đều vô nghĩa.`,
    );
  }

  const unlabeled = rows.filter(
    (l) => l.boundaryOk === null || l.latexOk === null || l.kindOk === null || l.expectedFigures === null,
  );
  if (unlabeled.length > 0) {
    throw new Error(
      `${meta.source}: còn ${unlabeled.length}/${rows.length} câu chưa chấm đủ ` +
        `(câu ${unlabeled.slice(0, 10).map((l) => l.index).join(", ")}).`,
    );
  }

  // Mẫu số của ranh giới, loại câu và LaTeX là tổng số câu thật trên đề:
  // câu model không trả về vẫn phải bị tính là sai.
  const withFigures = rows.filter((l) => (l.expectedFigures ?? 0) > 0);
  const withAnswer = rows.filter((l) => l.answerOk !== null);

  return {
    meta,
    labels,
    expected,
    boundary: rateOver(rows, (l) => l.boundaryOk, expected),
    kind: rateOver(rows, (l) => l.kindOk, expected),
    latex: rateOver(rows, (l) => l.latexOk, expected),
    figure: rateOver(withFigures, (l) => l.figureOk, withFigures.length),
    answer: rateOver(withAnswer, (l) => l.answerOk, withAnswer.length),
    missing: Math.max(0, expected - rows.length),
    spurious: Math.max(0, rows.length - expected),
  };
}

function boundaryThreshold(kind: SourceKind): number {
  return kind === "pdf-scan" ? THRESHOLDS.boundaryScanTarget : THRESHOLDS.boundaryDigital;
}

function row(label: string, rate: Rate, threshold: number): string {
  if (Number.isNaN(rate.pct)) {
    return `| ${label} | không có dữ liệu | 0 | ${threshold}% | - |`;
  }
  const value = `${rate.pct.toFixed(1)}%`;
  const pass = rate.pct >= threshold;
  return `| ${label} | ${value} | ${rate.ok}/${rate.total} | ${threshold}% | ${pass ? "đạt" : "chưa đạt"} |`;
}

function scanVerdict(boundary: Rate): string {
  if (boundary.pct >= THRESHOLDS.boundaryScanTarget) {
    return "Đạt mục tiêu. Giữ hướng dùng AI trích xuất.";
  }
  if (boundary.pct >= THRESHOLDS.boundaryScanFloor) {
    return "Trên sàn nhưng dưới mục tiêu. Dùng được nhưng admin phải sửa nhiều; cân nhắc tăng DPI hoặc đổi model.";
  }
  return `Dưới sàn ${THRESHOLDS.boundaryScanFloor}%. Theo plan: dừng tối ưu AI cho bản scan, chuyển sang tối ưu màn soát cho nhập nhanh.`;
}

function reportOne(scored: Scored): string[] {
  const { meta, boundary, kind, latex, figure, answer } = scored;
  const costOk =
    meta.costPerPageVnd === null || meta.costPerPageVnd < THRESHOLDS.costPerPageVnd;

  const lines = [
    `# Chất lượng trích xuất: ${meta.source}`,
    "",
    `- Nguồn: ${meta.sourceKind} · ${meta.pages ?? "-"} trang · đề có **${scored.expected} câu**, model trả về **${meta.questionCount} câu**`,
    `- Model: ${meta.config.model} · ${meta.config.dpi} DPI · tiền xử lý ${meta.config.preprocess}`,
    `- Prompt+schema: ${meta.promptVersion} · chạy lúc ${meta.extractedAt}`,
  ];

  if (!meta.complete) {
    lines.push(`- **Lần chạy thiếu ${meta.failedPages.length} trang lỗi** - số liệu dưới đây không đầy đủ`);
  }
  if (scored.missing > 0) lines.push(`- **Bỏ sót ${scored.missing} câu** (model không trả về)`);
  if (scored.spurious > 0) lines.push(`- **Thừa ${scored.spurious} câu** so với đề gốc`);
  if (meta.warnings.length > 0) lines.push(`- ${meta.warnings.length} cảnh báo tự động (xem meta.json)`);

  lines.push(
    "",
    "| Chỉ số | Kết quả | Đúng/Tổng | Ngưỡng | Đạt |",
    "|---|---|---|---|---|",
    row("Tách đúng ranh giới", boundary, boundaryThreshold(meta.sourceKind)),
    row("Nhận đúng loại câu", kind, 90),
    row("LaTeX đúng", latex, THRESHOLDS.latex),
    row("Hình gắn đúng câu", figure, THRESHOLDS.figure),
    `| Đáp án khớp đề gốc | ${Number.isNaN(answer.pct) ? "không có dữ liệu" : `${answer.pct.toFixed(1)}%`} | ${answer.ok}/${answer.total} | tham khảo | - |`,
    `| Chi phí mỗi trang | ${meta.costPerPageVnd === null ? "không áp dụng (docx)" : formatVnd(meta.costPerPageVnd)} | - | < ${formatVnd(THRESHOLDS.costPerPageVnd)} | ${costOk ? "đạt" : "chưa đạt"} |`,
    `| Chi phí mỗi câu | ${meta.costPerQuestionVnd === null ? "-" : formatVnd(meta.costPerQuestionVnd)} | - | tham khảo | - |`,
    "",
  );

  if (meta.sourceKind === "pdf-scan") {
    lines.push(`**Kết luận cho bản scan:** ${scanVerdict(boundary)}`, "");
  }

  const notes = scored.labels.rows.filter((l) => l.note.trim().length > 0);
  if (notes.length > 0) {
    lines.push("## Ghi chú của người soát", "");
    for (const label of notes) lines.push(`- Câu ${label.index}: ${label.note}`);
    lines.push("");
  }
  return lines;
}

/** Gộp nhiều lần chạy thành số liệu theo từng loại nguồn - đây mới là số để ra quyết định. */
function reportAggregate(runs: Scored[]): string[] {
  const lines = [
    "# Tổng hợp chất lượng trích xuất",
    "",
    `Gộp ${runs.length} đề. Mẫu số là tổng số câu thật của các đề, không phải số câu model trả về.`,
    "",
    "| Loại nguồn | Đề | Câu thật | Bỏ sót | Ranh giới | Loại câu | LaTeX | Hình | Chi phí/trang |",
    "|---|---|---|---|---|---|---|---|---|",
  ];

  for (const kind of ["pdf-digital", "pdf-scan", "docx"] as const) {
    const group = runs.filter((r) => r.meta.sourceKind === kind);
    if (group.length === 0) continue;

    const expected = sum(group, (r) => r.expected);
    const missing = sum(group, (r) => r.missing);
    const pct = (pick: (r: Scored) => Rate): string => {
      const ok = sum(group, (r) => pick(r).ok);
      const total = sum(group, (r) => pick(r).total);
      return total > 0 ? `${((ok / total) * 100).toFixed(1)}%` : "-";
    };
    const costs = group.map((r) => r.meta.costPerPageVnd).filter((c): c is number => c !== null);
    const avgCost = costs.length > 0 ? formatVnd(sum(costs, (c) => c) / costs.length) : "-";

    lines.push(
      `| ${kind} | ${group.length} | ${expected} | ${missing} | ${pct((r) => r.boundary)} | ` +
        `${pct((r) => r.kind)} | ${pct((r) => r.latex)} | ${pct((r) => r.figure)} | ${avgCost} |`,
    );
  }

  const scans = runs.filter((r) => r.meta.sourceKind === "pdf-scan");
  if (scans.length > 0) {
    const ok = sum(scans, (r) => r.boundary.ok);
    const total = sum(scans, (r) => r.boundary.total);
    const pct = total > 0 ? (ok / total) * 100 : Number.NaN;
    lines.push("", `**Kết luận cho bản scan:** ${scanVerdict({ pct, ok, total })}`);
  }

  const incomplete = runs.filter((r) => !r.meta.complete);
  if (incomplete.length > 0) {
    lines.push("", `**Cảnh báo:** ${incomplete.length} lần chạy bị thiếu trang lỗi, số liệu chưa đầy đủ.`);
  }
  lines.push("");
  return lines;
}

function sum<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}

async function scoreOne(outDir: string): Promise<void> {
  const { meta, labels } = await loadRun(outDir);
  const lines = reportOne(scoreRun(meta, labels));
  const reportPath = path.join(outDir, "quality-report.md");
  await fs.writeFile(reportPath, lines.join("\n"));
  console.log(lines.join("\n"));
  console.log(`\nĐã ghi ${path.relative(process.cwd(), reportPath)}`);
}

async function scoreAll(rootDir: string): Promise<void> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const runs: Scored[] = [];
  const skipped: string[] = [];

  for (const entry of entries.filter((e) => e.isDirectory())) {
    const dir = path.join(rootDir, entry.name);
    try {
      const { meta, labels } = await loadRun(dir);
      runs.push(scoreRun(meta, labels));
    } catch (error) {
      skipped.push(`${entry.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (runs.length === 0) {
    throw new Error(`Không có lần chạy nào đã chấm xong trong ${rootDir}:\n  ${skipped.join("\n  ")}`);
  }

  const lines = reportAggregate(runs);
  if (skipped.length > 0) {
    lines.push("## Bỏ qua", "");
    for (const item of skipped) lines.push(`- ${item}`);
    lines.push("");
  }

  const reportPath = path.join(rootDir, "quality-summary.md");
  await fs.writeFile(reportPath, lines.join("\n"));
  console.log(lines.join("\n"));
  console.log(`\nĐã ghi ${path.relative(process.cwd(), reportPath)}`);
}

async function main(): Promise<void> {
  const [command, target] = process.argv.slice(2);
  if (!target || (command !== "label" && command !== "score")) {
    console.error(
      "Cách dùng:\n" +
        "  pnpm spike:label <thư-mục-out>      tạo labels.json để chấm tay\n" +
        "  pnpm spike:score <thư-mục-out>      chấm một đề\n" +
        "  pnpm spike:score --all spike/out    gộp tất cả đề đã chấm",
    );
    process.exit(1);
  }

  if (command === "label") return buildLabels(path.resolve(target));
  if (target === "--all") return scoreAll(path.resolve(process.argv[4] ?? "spike/out"));
  return scoreOne(path.resolve(target));
}

main().catch((error: unknown) => {
  console.error(`\nLỗi: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
