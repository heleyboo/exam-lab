import fs from "node:fs/promises";
import path from "node:path";
import { run } from "./shell.js";
import type { PreprocessMode } from "./config.js";

export interface RenderedPage {
  /** Số trang thật, đọc từ tên file pdftoppm sinh ra, không phải vị trí trong thư mục. */
  page: number;
  imagePath: string;
  preprocessed: boolean;
}

export interface SourceKindDetection {
  scanned: boolean;
  embeddedFontLines: number;
  textLength: number;
  overridden: boolean;
}

/**
 * Phát hiện PDF dạng scan. Cờ này quyết định cả việc có tiền xử lý ảnh hay không
 * lẫn ngưỡng chấm điểm (90% cho PDF số, 80% cho scan), nên luôn kèm bằng chứng
 * và cho phép ép bằng tay khi heuristic đoán sai.
 */
export async function detectSourceKind(
  pdfPath: string,
  override?: "digital" | "scan",
): Promise<SourceKindDetection> {
  const fonts = await run("pdffonts", [pdfPath]);
  // pdffonts in 2 dòng tiêu đề rồi tới danh sách font.
  const embeddedFontLines = fonts
    .split("\n")
    .slice(2)
    .filter((line) => line.trim().length > 0).length;

  const text = await run("pdftotext", [pdfPath, "-"]);
  const textLength = text.replace(/\s/g, "").length;

  const guessed = embeddedFontLines === 0 || textLength < 200;
  return {
    scanned: override ? override === "scan" : guessed,
    embeddedFontLines,
    textLength,
    overridden: override !== undefined && override === "scan" !== guessed,
  };
}

export async function pageCount(pdfPath: string): Promise<number> {
  const info = await run("pdfinfo", [pdfPath]);
  const match = info.match(/^Pages:\s+(\d+)$/m);
  if (!match?.[1]) throw new Error(`Không đọc được số trang của ${pdfPath}`);
  return Number.parseInt(match[1], 10);
}

/**
 * Làm sạch ảnh scan trước khi gửi model: xám hoá, nắn nghiêng, cân bằng sáng, khử đốm.
 * `-deskew` nắn được ảnh scan lệch vài độ, lỗi phổ biến nhất của đề trường.
 */
async function preprocessImage(input: string, output: string): Promise<void> {
  await run("magick", [
    input,
    "-colorspace", "Gray",
    "-deskew", "40%",
    "+repage",
    "-normalize",
    "-despeckle",
    "-quality", "92",
    output,
  ]);
}

export interface RenderOptions {
  dpi: number;
  preprocess: PreprocessMode;
  scanned: boolean;
  /** Giới hạn khoảng trang, ví dụ { first: 1, last: 5 } để chạy thử đề dày mà không tốn cả tập. */
  range?: { first: number; last: number };
}

/** Render từng trang PDF thành PNG, tiền xử lý khi cần. */
export async function renderPdfPages(
  pdfPath: string,
  outDir: string,
  opts: RenderOptions,
): Promise<RenderedPage[]> {
  const rawDir = path.join(outDir, "pages-raw");
  const readyDir = path.join(outDir, "pages");

  // Xoá trước khi render: ảnh của lần chạy cũ còn sót lại sẽ bị coi là trang của đề này.
  await fs.rm(rawDir, { recursive: true, force: true });
  await fs.rm(readyDir, { recursive: true, force: true });
  await fs.mkdir(rawDir, { recursive: true });
  await fs.mkdir(readyDir, { recursive: true });

  const rangeArgs = opts.range
    ? ["-f", String(opts.range.first), "-l", String(opts.range.last)]
    : [];
  await run("pdftoppm", [
    "-png",
    "-r", String(opts.dpi),
    ...rangeArgs,
    pdfPath,
    path.join(rawDir, "page"),
  ]);

  const rendered = (await fs.readdir(rawDir)).filter((f) => f.endsWith(".png"));
  if (rendered.length === 0) throw new Error(`pdftoppm không tạo ra trang nào từ ${pdfPath}`);

  const shouldPreprocess = opts.preprocess === "on" || (opts.preprocess === "auto" && opts.scanned);

  const pages: RenderedPage[] = [];
  for (const file of rendered) {
    // pdftoppm đặt tên page-1.png, page-01.png hoặc page-001.png tuỳ tổng số trang,
    // nên số trang phải lấy từ tên file chứ không lấy theo thứ tự đọc thư mục.
    const match = file.match(/-(\d+)\.png$/);
    if (!match?.[1]) throw new Error(`Không đọc được số trang từ tên file '${file}'`);
    const page = Number.parseInt(match[1], 10);

    const rawImagePath = path.join(rawDir, file);
    let imagePath = rawImagePath;
    if (shouldPreprocess) {
      imagePath = path.join(readyDir, file);
      await preprocessImage(rawImagePath, imagePath);
    }

    pages.push({ page, imagePath, preprocessed: shouldPreprocess });
  }

  pages.sort((a, b) => a.page - b.page);
  return pages;
}
