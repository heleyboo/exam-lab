import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig, type SpikeConfig } from "./lib/config";
import { detectSourceKind, pageCount, renderPdfPages, rotateImage } from "../src/server/extraction/render-pdf";
import { detectOrientationVerified, DEFAULT_ORIENTATION_MODEL } from "../src/server/extraction/detect-orientation";
import { extractPage, pagePromptVersion, PageExtractionError } from "../src/server/ai/extract-page";
import { extractDocx } from "../src/server/ai/extract-docx";
import { cropFigure } from "../src/server/extraction/crop-figures";
import { mergePages } from "../src/server/extraction/merge-pages";
import { addUsage, costOf, formatVnd, priceOf, type Usage } from "../src/server/ai/cost";
import { MergedQuestion, RunMeta, type PageExtraction, type SourceKind } from "../src/server/extraction/schema";

const USAGE_TEXT = `
Cách dùng:
  pnpm spike:extract <file.pdf|file.docx> [cờ]

Cờ:
  --out <thư-mục>        thư mục kết quả (mặc định: spike/out/<tên>-<model>-<dpi>-<preprocess>)
  --dpi <số>             DPI render trang (mặc định 200)
  --preprocess auto|on|off   tiền xử lý ảnh scan (mặc định auto)
  --model <id>           model trích xuất (mặc định claude-opus-5)
  --kind digital|scan    ép loại nguồn khi tự nhận dạng sai
  --pages <a-b[,c-d]>    chỉ chạy các khoảng trang, ví dụ 1-4 hoặc 1-4,17
  --rotate auto|off|<độ>  hướng trang: auto (mặc định, dò bằng model nhỏ), off, hoặc ép 90/180/270
  --exam-code <mã>       chỉ lấy dữ liệu của một mã đề, ví dụ 0101

Ví dụ:
  pnpm spike:extract spike/fixtures/de-thi-thu-lhp-2025.pdf
  pnpm spike:extract spike/fixtures/de-scan.pdf --dpi 300 --preprocess on
  pnpm spike:extract spike/fixtures/de-day.pdf --pages 1-4
  pnpm spike:extract spike/fixtures/de-thi.pdf --pages 1-4,17   # đề kèm trang đáp án
`;

interface Args {
  file: string;
  out?: string;
  kind?: "digital" | "scan";
  ranges?: { first: number; last: number }[];
  /** undefined = auto (mặc định), "off" = không xoay, số = ép góc. */
  rotate?: number | "off";
  examCode?: string;
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

  const known = ["--out", "--dpi", "--preprocess", "--model", "--kind", "--pages", "--rotate", "--exam-code"];
  for (const flag of flags.keys()) {
    if (!known.includes(flag)) throw new Error(`Cờ không hợp lệ: ${flag}\n${USAGE_TEXT}`);
  }

  const kind = flags.get("--kind");
  if (kind !== undefined && kind !== "digital" && kind !== "scan") {
    throw new Error(`--kind phải là digital hoặc scan, đang là '${kind}'`);
  }

  const rotateRaw = flags.get("--rotate");
  let rotate: number | "off" | undefined;
  if (rotateRaw !== undefined && rotateRaw !== "auto") {
    if (rotateRaw === "off") {
      rotate = "off";
    } else {
      rotate = Number.parseInt(rotateRaw, 10);
      if (![0, 90, 180, 270].includes(rotate)) {
        throw new Error(`--rotate phải là auto, off, 0, 90, 180 hoặc 270, đang là '${rotateRaw}'`);
      }
    }
  }

  let ranges: Args["ranges"];
  const pages = flags.get("--pages");
  if (pages !== undefined) {
    ranges = pages.split(",").map((part) => {
      const match = part.trim().match(/^(\d+)-(\d+)$/);
      if (!match?.[1] || !match[2]) {
        throw new Error(`--pages phải có dạng a-b hoặc a-b,c-d, đang là '${pages}'`);
      }
      const range = { first: Number.parseInt(match[1], 10), last: Number.parseInt(match[2], 10) };
      if (range.first < 1 || range.last < range.first) {
        throw new Error(`--pages '${part.trim()}' không hợp lệ`);
      }
      return range;
    });
  }

  return {
    file,
    ...(flags.get("--out") !== undefined ? { out: flags.get("--out")! } : {}),
    ...(kind !== undefined ? { kind } : {}),
    ...(ranges !== undefined ? { ranges } : {}),
    ...(rotate !== undefined ? { rotate } : {}),
    ...(flags.get("--exam-code") !== undefined ? { examCode: flags.get("--exam-code")! } : {}),
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
  // Kèm cả khoảng trang: một file tuyển tập chạy nhiều lần cho nhiều đề khác nhau,
  // thiếu phần này thì đề sau đè lên đề trước.
  const rangeSuffix = args.ranges
    ? `-p${args.ranges.map((r) => `${r.first}-${r.last}`).join("_")}`
    : "";
  const defaultOut = path.join(
    "spike",
    "out",
    `${baseName}${rangeSuffix}-${config.model}-${config.dpi}-${config.preprocess}`,
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
  const orientationMode: "auto" | "fixed" | "off" =
    args.rotate === undefined ? "auto" : args.rotate === "off" ? "off" : "fixed";
  const orientationModel = process.env.SPIKE_ORIENTATION_MODEL ?? DEFAULT_ORIENTATION_MODEL;
  const orientationPerPage: { page: number; rotate: number; reason: string }[] = [];
  let orientationUsage: Usage = { inputTokens: 0, outputTokens: 0 };

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
      ...(args.ranges ? { ranges: args.ranges } : {}),
    });
    pages = rendered.length;

    const expected = args.ranges
      ? args.ranges.reduce((sum, r) => sum + Math.min(r.last, total) - r.first + 1, 0)
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
      // Dò hướng trước khi gửi trang cho model trích xuất: đoán sai hướng không
      // gây lỗi nào mà chỉ lặng lẽ trả về dữ liệu sai, nên không thể để người
      // dùng tự đoán.
      let imagePath = page.imagePath;
      let degrees = 0;
      if (orientationMode === "fixed") {
        degrees = args.rotate as number;
      } else if (orientationMode === "auto") {
        const detected = await detectOrientationVerified(page.imagePath, {
          model: orientationModel,
          scratchDir: path.join(outDir, "thumbs"),
        });
        degrees = detected.rotate;
        orientationUsage = addUsage(orientationUsage, detected.usage);
        orientationPerPage.push({ page: page.page, rotate: degrees, reason: detected.reason });
      }
      if (degrees !== 0) {
        imagePath = await rotateImage(
          page.imagePath,
          path.join(outDir, "pages-rotated", path.basename(page.imagePath)),
          degrees,
        );
        page.imagePath = imagePath;
      }

      try {
        const result = await extractPage(imagePath, {
          model: config.model,
          pageNumber: page.page,
          totalPages: rendered.length,
          examCode: args.examCode,
        });
        usage = addUsage(usage, result.usage);
        pageResults.push({ page: page.page, extraction: result.extraction });

        await fs.writeFile(
          path.join(outDir, "raw", `page-${String(page.page).padStart(3, "0")}.json`),
          JSON.stringify(result.extraction, null, 2),
        );
        console.log(
          `  trang ${page.page}/${rendered.length}: ${result.extraction.questions.length} câu · ` +
            `${(result.durationMs / 1000).toFixed(1)}s${result.retried ? " (phải thử lại)" : ""}`,
        );
        if (result.retried) {
          warnings.push(`Trang ${page.page}: chạm trần token ở lần gọi đầu, đã thử lại`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Lần gọi hỏng vẫn bị tính tiền: cộng vào usage để báo cáo chi phí đúng thực tế.
        if (error instanceof PageExtractionError) usage = addUsage(usage, error.usage);
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

  const extractionCost = costOf(config.model, usage, config.usdToVnd);
  const orientationCost =
    orientationMode === "auto"
      ? costOf(orientationModel, orientationUsage, config.usdToVnd)
      : { usd: 0, vnd: 0 };
  // Cộng cả hai model vào một con số: đó mới là số tiền thật phải trả cho trang đó.
  const cost = {
    usd: extractionCost.usd + orientationCost.usd,
    vnd: extractionCost.vnd + orientationCost.vnd,
  };
  const meta = RunMeta.parse({
    source: path.relative(process.cwd(), inputPath),
    sourceKind,
    sourceKindEvidence,
    pages,
    questionCount: questions.length,
    examCodes: [...new Set(questions.map((q) => q.examCode).filter(Boolean))],
    byKind: countBy(questions, (q) => q.kind),
    withAnswer: questions.filter((q) => q.answerKey).length,
    withFigures: questions.filter((q) => q.figureFiles.length > 0).length,
    failedPages,
    warnings,
    config,
    promptVersion,
    orientation: {
      mode: orientationMode,
      model: orientationMode === "auto" ? orientationModel : null,
      perPage: orientationPerPage,
      usage: orientationUsage,
      cost: orientationCost,
    },
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
  const rotatedPages = orientationPerPage.filter((p) => p.rotate !== 0);
  if (rotatedPages.length > 0) {
    console.log(
      `Đã xoay ${rotatedPages.length} trang: ` +
        rotatedPages.map((p) => `trang ${p.page} → ${p.rotate}°`).join(", "),
    );
  }
  console.log(
    `Chi phí: ${formatVnd(cost.vnd)}` +
      (orientationCost.vnd > 0 ? ` (dò hướng ${formatVnd(orientationCost.vnd)})` : "") +
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
