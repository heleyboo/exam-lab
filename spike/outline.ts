import path from "node:path";
import { run } from "./lib/shell.js";
import { pageCount } from "./lib/render-pdf.js";

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
const BOUNDARY = "(?:^|[^\\p{L}])";

const MARKERS: { label: string; pattern: RegExp }[] = [
  {
    label: "đề",
    pattern: new RegExp(`${BOUNDARY}ĐỀ\\s*(?:SỐ|ÔN|THI|MINH\\s*HỌA|THAM\\s*KHẢO|\\d+)`, "iu"),
  },
  {
    label: "lời giải",
    pattern: new RegExp(
      `${BOUNDARY}(?:HƯỚNG\\s*DẪN\\s*(?:GIẢI|CHẤM)|LỜI\\s*GIẢI|ĐÁP\\s*ÁN)`,
      "iu",
    ),
  },
];

const TOC_PATTERN = /MỤC\s*LỤC/iu;

interface PageInfo {
  page: number;
  marker: string | null;
  headline: string;
  textLength: number;
}

async function pageText(pdfPath: string, page: number): Promise<string> {
  return run("pdftotext", ["-f", String(page), "-l", String(page), pdfPath, "-"]);
}

function classify(text: string): { marker: string | null; headline: string } {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const head = lines.slice(0, 6);

  // Trang mục lục liệt kê tên mọi đề, nhận nhầm thành trang bắt đầu đề thì
  // khoảng trang suy ra sẽ sai toàn bộ. Dấu hiệu: chữ "mục lục" hoặc nhiều
  // dòng có dãy chấm dẫn trang.
  const dottedLines = lines.filter((line) => /\.{4,}/.test(line)).length;
  if (TOC_PATTERN.test(text) || dottedLines >= 3) {
    return { marker: "mục lục", headline: head[0]?.slice(0, 70) ?? "" };
  }

  for (const line of head) {
    for (const { label, pattern } of MARKERS) {
      if (pattern.test(line)) return { marker: label, headline: line.slice(0, 70) };
    }
  }
  return { marker: null, headline: head[0]?.slice(0, 70) ?? "" };
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
    const text = await pageText(pdfPath, page);
    pages.push({ page, ...classify(text), textLength: text.replace(/\s/g, "").length });
  }

  // Tín hiệu trực tiếp thay vì ngưỡng đoán: không trang nào rút được chữ
  // thì file không có text layer. Trang bìa hay trang phân cách vốn rất ít
  // chữ, đặt ngưỡng ký tự sẽ kết luận nhầm cả file là bản scan.
  const pagesWithText = pages.filter((page) => page.textLength > 0).length;
  if (pagesWithText === 0) {
    console.log("File không có text layer (bản scan).");
    console.log("Mở file xem bằng mắt để biết mỗi đề từ trang nào tới trang nào, rồi chạy:");
    console.log("  pnpm spike:extract <file> --pages <a-b> --out spike/out/<tên-đề>");
    return;
  }

  const emptyPages = pages.filter((p) => p.textLength === 0).length;
  if (emptyPages > total / 4) {
    console.log(
      `Cảnh báo: ${emptyPages}/${total} trang không có chữ nào - file trộn cả trang scan, danh sách dưới đây có thể thiếu.\n`,
    );
  }

  const starts = pages.filter((p): p is PageInfo & { marker: string } => p.marker !== null);
  if (starts.length === 0) {
    console.log("Không tìm thấy dấu hiệu ranh giới đề nào trong text.");
    console.log("Xem bằng mắt rồi chạy pnpm spike:extract với --pages.");
    return;
  }

  // Phần lời giải phía sau sách thường nhắc lại "Đề số N" ở mỗi bài giải.
  // Đã qua mốc lời giải thì mọi mốc "đề" sau đó thuộc phần lời giải, không
  // phải một đề mới; đếm nhầm sẽ sinh ra hàng loạt khoảng trang vô nghĩa.
  const firstSolution = starts.find((s) => s.marker === "lời giải")?.page;
  const labelled = starts.map((info) => ({
    ...info,
    inSolutions: firstSolution !== undefined && info.page >= firstSolution,
  }));

  console.log("Trang có dấu hiệu bắt đầu một phần mới:\n");
  for (const info of labelled) {
    const suffix = info.inSolutions && info.marker === "đề" ? " (trong phần lời giải)" : "";
    console.log(
      `  trang ${String(info.page).padStart(3)} · ${info.marker.padEnd(9)} · ${info.headline}${suffix}`,
    );
  }

  // Khoảng trang suy ra: từ mốc này tới ngay trước mốc kế tiếp.
  const exams = labelled.filter((s) => s.marker === "đề" && !s.inSolutions);
  if (exams.length > 0) {
    console.log(`\nĐoán được ${exams.length} đề. Lệnh chạy từng đề:\n`);
    for (const [index, exam] of exams.entries()) {
      const next = starts.find((s) => s.page > exam.page);
      const last = next ? next.page - 1 : total;
      const name = `${path.basename(pdfPath).replace(/\.[^.]+$/, "")}-de${String(index + 1).padStart(2, "0")}`;
      console.log(
        `  pnpm spike:extract ${file} --pages ${exam.page}-${last} --out spike/out/${name}`,
      );
    }
    console.log("\nKiểm lại vài khoảng trang trước khi chạy: dò bằng chữ không phải lúc nào cũng đúng.");
  }

  const solutions = starts.filter((s) => s.marker === "lời giải");
  if (solutions.length > 0) {
    console.log(
      `\n${solutions.length} mốc phần lời giải. Chạy riêng phần này rồi ghép với đề sau, ` +
        `công cụ không tự nối lời giải ở cuối sách vào đúng đề.`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(`\nLỗi: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
