import path from "node:path";
import { run } from "../src/server/extraction/shell";
import { pageCount } from "../src/server/extraction/render-pdf";

/**
 * Dò ranh giới đề trong một file tuyển tập nhiều đề.
 *
 * Tách đề ra chạy riêng là bắt buộc: chạy cả tuyển tập một lượt sẽ để câu cuối
 * đề này dính vào câu đầu đề sau, và đáp án "Phần I Câu 1" của đề sau ghi đè
 * lên đề trước.
 *
 * Chỉ đọc được text layer, nên bản scan sẽ không ra gì - khi đó phải mở file
 * xem bằng mắt rồi tự điền khoảng trang.
 */

// Không dùng \b quanh chữ tiếng Việt: \b của JavaScript chỉ tính theo ký tự
// ASCII, nên \bĐỀ không bao giờ khớp. Dùng ranh giới theo lớp chữ cái Unicode.
const EXAM_PATTERN = /(?:^|[^\p{L}])ĐỀ\s*(?:SỐ|BÀI)?\s*(\d+)/giu;
const SOLUTION_PATTERN = /(?:^|[^\p{L}])(?:HƯỚNG\s*DẪN\s*(?:GIẢI|CHẤM)|LỜI\s*GIẢI\s*CHI\s*TIẾT)/iu;
const TOC_PATTERN = /MỤC\s*LỤC/iu;

interface PageInfo {
  page: number;
  isToc: boolean;
  hasSolutionHeader: boolean;
  examNumbers: number[];
  textLength: number;
}

interface Marker {
  page: number;
  number: number;
}

/** Một lượt đánh số đề. Sách thường có lượt đề rồi tới lượt lời giải, đánh số lại từ đầu. */
interface Pass {
  markers: Marker[];
  firstPage: number;
  lastPage: number;
  /** Có mốc lời giải trong khoảng trang này. Không đủ để kết luận cả lượt là phần lời giải. */
  hasSolutionMarkers: boolean;
}

async function pageText(pdfPath: string, page: number): Promise<string> {
  return run("pdftotext", ["-f", String(page), "-l", String(page), pdfPath, "-"]);
}

function inspect(page: number, text: string): PageInfo {
  const dottedLines = text.split("\n").filter((line) => /\.{4,}/.test(line)).length;
  // Trang mục lục liệt kê tên mọi đề; đếm nó thành trang bắt đầu đề sẽ làm
  // hỏng toàn bộ khoảng trang suy ra sau đó.
  const isToc = TOC_PATTERN.test(text) || dottedLines >= 3;

  const numbers = isToc
    ? []
    : [...text.matchAll(EXAM_PATTERN)]
        .map((match) => Number.parseInt(match[1] ?? "", 10))
        .filter((value) => Number.isInteger(value) && value > 0 && value < 1000);

  return {
    page,
    isToc,
    hasSolutionHeader: SOLUTION_PATTERN.test(text),
    examNumbers: numbers,
    textLength: text.replace(/\s/g, "").length,
  };
}

/**
 * Cắt danh sách mốc thành các lượt.
 * Ranh giới lượt: số đề quay lại nhỏ hơn hoặc bằng số trước đó (sách chuyển
 * sang phần lời giải và đánh số lại), hoặc nhảy vọt quá xa (sang phần khác).
 */
function splitPasses(markers: Marker[], pages: PageInfo[], totalPages: number): Pass[] {
  const passes: Pass[] = [];
  let current: Marker[] = [];

  for (const marker of markers) {
    const previous = current.at(-1);
    const resets = previous !== undefined && marker.number <= previous.number;
    const jumps = previous !== undefined && marker.number - previous.number > 3;
    if (previous !== undefined && (resets || jumps)) {
      passes.push(buildPass(current, pages, totalPages, marker.page - 1));
      current = [];
    }
    current.push(marker);
  }
  if (current.length > 0) passes.push(buildPass(current, pages, totalPages, totalPages));
  return passes;
}

function buildPass(
  markers: Marker[],
  pages: PageInfo[],
  totalPages: number,
  lastPage: number,
): Pass {
  const firstPage = markers[0]?.page ?? 1;
  const end = Math.min(lastPage, totalPages);
  const hasSolutionMarkers = pages.some(
    (p) => p.page >= firstPage && p.page <= end && p.hasSolutionHeader,
  );
  return { markers, firstPage, lastPage: end, hasSolutionMarkers };
}

/** Khoảng trang của từng đề: tới ngay trước đề kế tiếp, hoặc hết lượt. */
function rangesOf(pass: Pass): { number: number; first: number; last: number; shared: boolean }[] {
  return pass.markers.map((marker, index) => {
    const next = pass.markers[index + 1];
    const last = next ? Math.max(marker.page, next.page - 1) : pass.lastPage;
    const shared = next?.page === marker.page;
    return { number: marker.number, first: marker.page, last, shared };
  });
}

function shellQuote(value: string): string {
  return /[^A-Za-z0-9._/-]/.test(value) ? `'${value.replaceAll("'", `'\\''`)}'` : value;
}

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) {
    console.error("Cách dùng:\n  pnpm spike:outline <file.pdf>");
    process.exit(1);
  }

  const pdfPath = path.resolve(file);
  const total = await pageCount(pdfPath);
  console.log(`${path.basename(pdfPath)} · ${total} trang\n`);

  const pages: PageInfo[] = [];
  for (let page = 1; page <= total; page++) {
    pages.push(inspect(page, await pageText(pdfPath, page)));
  }

  // Tín hiệu trực tiếp thay vì ngưỡng đoán: không trang nào rút được chữ thì
  // file không có text layer.
  if (pages.every((page) => page.textLength === 0)) {
    console.log("File không có text layer (bản scan).");
    console.log("Mở file xem bằng mắt để biết mỗi đề từ trang nào tới trang nào, rồi chạy:");
    console.log("  pnpm spike:extract <file> --pages <a-b> --out spike/out/<tên-đề>");
    return;
  }

  const tocPages = pages.filter((p) => p.isToc).map((p) => p.page);
  if (tocPages.length > 0) {
    console.log(`Bỏ qua trang mục lục: ${tocPages.join(", ")}\n`);
  }

  // Quét cả trang chứ không chỉ mấy dòng đầu: trong sách các đề nối tiếp nhau
  // nên tiêu đề "ĐỀ SỐ n" thường nằm giữa trang.
  const markers: Marker[] = pages.flatMap((page) =>
    page.examNumbers.map((number) => ({ page: page.page, number })),
  );
  if (markers.length === 0) {
    console.log("Không tìm thấy mốc 'ĐỀ SỐ n' nào. Xem bằng mắt rồi chạy spike:extract với --pages.");
    return;
  }

  const passes = splitPasses(markers, pages, total);
  const quoted = shellQuote(file);
  const baseName = path.basename(pdfPath).replace(/\.[^.]+$/, "").slice(0, 24).replaceAll(" ", "-");

  console.log(`Tìm thấy ${passes.length} lượt đánh số đề:\n`);
  for (const [index, pass] of passes.entries()) {
    const numbers = pass.markers.map((m) => m.number);
    const pageSpan = pass.lastPage - pass.firstPage + 1;
    console.log(
      `  Lượt ${index + 1}: trang ${pass.firstPage}-${pass.lastPage} · ` +
        `đề ${Math.min(...numbers)}–${Math.max(...numbers)} (${numbers.length} đề) · ` +
        `${(pageSpan / numbers.length).toFixed(1)} trang/đề · ` +
        `${pass.hasSolutionMarkers ? "có mốc lời giải" : "không thấy mốc lời giải"}`,
    );
  }

  for (const [index, pass] of passes.entries()) {
    const ranges = rangesOf(pass);
    const shared = ranges.filter((r) => r.shared).length;
    console.log(`\n--- Lượt ${index + 1} ---`);
    if (shared > 0) {
      console.log(
        `${shared} đề dùng chung trang với đề kế tiếp - khoảng trang sẽ chồng nhau, ` +
          `lần chạy đó sẽ trích ra cả hai đề.`,
      );
    }
    console.log("");
    for (const range of ranges.slice(0, 60)) {
      const name = `${baseName}-l${index + 1}de${String(range.number).padStart(2, "0")}`;
      console.log(
        `  pnpm spike:extract ${quoted} --pages ${range.first}-${range.last} --out spike/out/${name}`,
      );
    }
    if (ranges.length > 60) console.log(`  ... còn ${ranges.length - 60} đề`);
  }

  console.log(
    "\nKiểm lại vài khoảng trang trước khi chạy: dò bằng chữ không phải lúc nào cũng đúng.",
  );
  if (passes.some((p) => p.hasSolutionMarkers)) {
    console.log(
      "Số trang/đề lớn nghĩa là lượt đó gồm cả lời giải. Công cụ không tự nối lời giải vào đúng đề - chạy riêng rồi ghép khi đọc kết quả.",
    );
  }
}

main().catch((error: unknown) => {
  console.error(`\nLỗi: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
