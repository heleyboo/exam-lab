import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig, type SpikeConfig } from "./lib/config.js";
import { detectSourceKind, pageCount, renderPdfPages } from "./lib/render-pdf.js";
import { extractPage, pagePromptVersion } from "./lib/extract-page.js";
import { extractDocx } from "./lib/extract-docx.js";
import { cropFigure } from "./lib/crop-figures.js";
import { mergePages } from "./lib/merge-pages.js";
import { addUsage, costOf, formatVnd, priceOf, type Usage } from "./lib/cost.js";
import { MergedQuestion, RunMeta, type PageExtraction, type SourceKind } from "./schema.js";

const USAGE_TEXT = `
Cách dùng:
  pnpm spike:extract <file.pdf|file.docx> [cờ]

Cờ:
  --out <thư-mục>        thư mục kết quả (mặc định: spike/out/<tên>-<model>-<dpi>-<preprocess>)
  --dpi <số>             DPI render trang (mặc định 200)
  --preprocess auto|on|off   tiền xử lý ảnh scan (mặc định auto)
  --model <id>           model trích xuất (mặc định claude-opus-5)
  --kind digital|scan    ép loại nguồn khi tự nhận dạng sai
  --pages <a-b>          chỉ chạy khoảng trang, ví dụ 1-5

Ví dụ:
  pnpm spike:extract spike/fixtures/de-thi-thu-lhp-2025.pdf
  pnpm spike:extract spike/fixtures/de-scan.pdf --dpi 300 --preprocess on
  pnpm spike:extract spike/fixtures/de-day.pdf --pages 1-4
`;

interface Args {
  file: string;
  out?: string;
  kind?: "digital" | "scan";
  range?: { first: number; last: number };
  config: SpikeConfig;
}

function parseArgs(argv: string[]): Args {
  const [file, ...rest] = argv;
  if (!file || file.startsWith("--")) throw new Error(`Thiếu đường dẫn file.\n${USAGE_TEXT}`);

  const flags = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i];
    const value = rest[i + 1];
    if (!flag?.startsWith("--")) throw new Error(`Cờ phải bắt đầu bằng --, gặp '${flag}'`);
    if (value === undefined) throw new Error(`Thiếu giá trị cho ${flag}`);
    flags.set(flag, value);
  }

  const known = ["--out", "--dpi", "--preprocess", "--model", "--kind", "--pages"];
  for (const flag of flags.keys()) {
    if (!known.includes(flag)) throw new Error(`Cờ không hợp lệ: ${flag}\n${USAGE_TEXT}`);
  }

  const kind = flags.get("--kind");
  if (kind !== undefined && kind !== "digital" && kind !== "scan") {
    throw new Error(`--kind phải là digital hoặc scan, đang là '${kind}'`);
  }

  let range: Args["range"];
  const pages = flags.get("--pages");
  if (pages !== undefined) {
    const match = pages.match(/^(\d+)-(\d+)$/);
    if (!match?.[1] || !match[2]) throw new Error(`--pages phải có dạng a-b, đang là '${pages}'`);
    range = { first: Number.parseInt(match[1], 10), last: Number.parseInt(match[2], 10) };
    if (range.first < 1 || range.last < range.first) throw new Error(`--pages '${pages}' không hợp lệ`);
  }

  return {
    file,
    ...(flags.get("--out") !== undefined ? { out: flags.get("--out")! } : {}),
    ...(kind !== undefined ? { kind } : {}),
    ...(range !== undefined ? { range } : {}),
    config: loadConfig({
      model: flags.get("--model"),
      dpi: flags.get("--dpi"),
      preprocess: flags.get("--preprocess"),
    }),
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { config } = args;

  // Kiểm tra mọi thứ có thể hỏng TRƯỚC khi tốn một đồng nào cho API.
  priceOf(config.model);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("Chưa có ANTHROPIC_API_KEY trong môi trường - sẽ thử dùng profile `ant auth login`.");
  }

  const inputPath = path.resolve(args.file);
  await fs.access(inputPath);
  const baseName = path.basename(inputPath).replace(/\.[^.]+$/, "");
  // Tên thư mục kèm biến thể: chạy 200 DPI rồi 300 DPI phải ra hai thư mục khác nhau,
  // nếu không lần sau sẽ đè lên lần trước và số đo của hai lần lẫn vào nhau.
  const defaultOut = path.join(
    "spike",
    "out",
    `${baseName}-${config.model}-${config.dpi}-${config.preprocess}`,
  );
  const outDir = path.resolve(args.out ?? defaultOut);

  await fs.rm(path.join(outDir, "raw"), { recursive: true, force: true });
  await fs.rm(path.join(outDir, "figures"), { recursive: true, force: true });
  await fs.mkdir(path.join(outDir, "raw"), { recursive: true });

  const extension = path.extname(inputPath).toLowerCase();
  const startedAt = Date.now();

  let questions: MergedQuestion[] = [];
  let usage: Usage = { inputTokens: 0, outputTokens: 0 };
  let promptVersion = "";
  let sourceKind: SourceKind;
  let sourceKindEvidence = { embeddedFontLines: 0, textLength: 0, overridden: false };
  let pages: number | null = null;
  const failedPages: { page: number; error: string }[] = [];
  const warnings: string[] = [];

  if (extension === ".pdf") {
    const detection = await detectSourceKind(inputPath, args.kind);
    sourceKind = detection.scanned ? "pdf-scan" : "pdf-digital";
    sourceKindEvidence = {
      embeddedFontLines: detection.embeddedFontLines,
      textLength: detection.textLength,
      overridden: detection.overridden,
    };
    const total = await pageCount(inputPath);
    console.log(
      `Đề: ${baseName} · ${total} trang · ${detection.scanned ? "bản scan" : "PDF số"}` +
        (detection.overridden ? " (ép bằng --kind)" : ""),
    );

    const rendered = await renderPdfPages(inputPath, outDir, {
      dpi: config.dpi,
      preprocess: config.preprocess,
      scanned: detection.scanned,
      ...(args.range ? { range: args.range } : {}),
    });
    pages = rendered.length;

    const expected = args.range
      ? Math.min(args.range.last, total) - args.range.first + 1
      : total;
    if (rendered.length !== expected) {
      throw new Error(
        `Render ra ${rendered.length} trang nhưng đề có ${expected} trang cần xử lý - dừng để không đo sai.`,
      );
    }
    console.log(
      `Đã render ${rendered.length} trang ở ${config.dpi} DPI` +
        (rendered[0]?.preprocessed ? " (có tiền xử lý ảnh)" : ""),
    );

    const pageResults: { page: number; extraction: PageExtraction }[] = [];

    // Chạy tuần tự, một trang lỗi không được làm mất công của các trang đã trả tiền.
    for (const page of rendered) {
      try {
        const result = await extractPage(page.imagePath, {
          model: config.model,
          pageNumber: page.page,
          totalPages: rendered.length,
        });
        usage = addUsage(usage, result.usage);
        pageResults.push({ page: page.page, extraction: result.extraction });

        await fs.writeFile(
          path.join(outDir, "raw", `page-${String(page.page).padStart(3, "0")}.json`),
          JSON.stringify(result.extraction, null, 2),
        );
        console.log(
          `  trang ${page.page}/${rendered.length}: ${result.extraction.questions.length} câu · ` +
            `${(result.durationMs / 1000).toFixed(1)}s`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failedPages.push({ page: page.page, error: message });
        console.warn(`  trang ${page.page}/${rendered.length}: LỖI - ${message}`);
      }
    }

    const merged = mergePages(pageResults);
    questions = merged.questions;
    warnings.push(...merged.warnings);

    for (const [index, question] of questions.entries()) {
      for (const [figureIndex, figure] of question.figures.entries()) {
        // Cắt từ đúng ảnh model đã nhìn, và đúng trang chứa hình đó:
        // câu trải qua hai trang thì hình có thể nằm ở trang sau.
        const source = rendered.find((p) => p.page === figure.page)?.imagePath;
        if (!source) {
          warnings.push(`Câu thứ ${index + 1}: không có ảnh trang ${figure.page} để cắt hình`);
          continue;
        }
        const relative = path.join("figures", `q${index + 1}-${figureIndex + 1}.png`);
        try {
          await cropFigure(source, figure, path.join(outDir, relative));
          question.figureFiles.push(relative);
        } catch (error) {
          warnings.push(
            `Câu thứ ${index + 1}: cắt hình lỗi (${error instanceof Error ? error.message : String(error)})`,
          );
        }
      }
    }

    promptVersion = await pagePromptVersion();
  } else if (extension === ".docx") {
    sourceKind = "docx";
    console.log(`Đề: ${baseName} · file Word`);
    const result = await extractDocx(inputPath, outDir, { model: config.model });
    const merged = mergePages([{ page: 1, extraction: result.extraction }]);
    questions = merged.questions;
    warnings.push(...merged.warnings);
    usage = result.usage;
    promptVersion = result.promptVersion;
  } else {
    throw new Error(`Chỉ hỗ trợ .pdf và .docx, không hỗ trợ '${extension}'`);
  }

  const cost = costOf(config.model, usage, config.usdToVnd);
  const meta = RunMeta.parse({
    source: path.relative(process.cwd(), inputPath),
    sourceKind,
    sourceKindEvidence,
    pages,
    questionCount: questions.length,
    byKind: countBy(questions, (q) => q.kind),
    withAnswer: questions.filter((q) => q.answerKey).length,
    withFigures: questions.filter((q) => q.figureFiles.length > 0).length,
    failedPages,
    warnings,
    config,
    promptVersion,
    usage,
    cost,
    // docx không có khái niệm trang nên chi phí mỗi trang không đo được, để null
    // thay vì chia cho 1 rồi báo vượt ngưỡng oan.
    costPerPageVnd: pages && pages > 0 ? cost.vnd / pages : null,
    costPerQuestionVnd: questions.length > 0 ? cost.vnd / questions.length : null,
    durationMs: Date.now() - startedAt,
    extractedAt: new Date().toISOString(),
    complete: failedPages.length === 0,
  } satisfies RunMeta);

  await fs.writeFile(
    path.join(outDir, "questions.json"),
    JSON.stringify(MergedQuestion.array().parse(questions), null, 2),
  );
  await fs.writeFile(path.join(outDir, "meta.json"), JSON.stringify(meta, null, 2));

  const relativeOut = path.relative(process.cwd(), outDir);
  console.log(
    `\n${meta.complete ? "Xong" : `CHẠY THIẾU (${failedPages.length} trang lỗi)`}: ` +
      `${questions.length} câu · ${meta.withAnswer} câu có đáp án · ${meta.withFigures} câu có hình`,
  );
  if (warnings.length > 0) {
    console.log(`Cảnh báo: ${warnings.length} (xem warnings trong meta.json)`);
    for (const warning of warnings.slice(0, 5)) console.log(`  - ${warning}`);
    if (warnings.length > 5) console.log(`  ... còn ${warnings.length - 5} cảnh báo`);
  }
  console.log(
    `Chi phí: ${formatVnd(cost.vnd)}` +
      (meta.costPerPageVnd !== null ? ` (${formatVnd(meta.costPerPageVnd)}/trang)` : "") +
      ` · ${((Date.now() - startedAt) / 1000).toFixed(0)}s · model ${config.model}`,
  );
  console.log(`Kết quả: ${relativeOut}`);
  console.log(`Bước tiếp: pnpm spike:label ${relativeOut}`);
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

main().catch((error: unknown) => {
  console.error(`\nLỗi: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
