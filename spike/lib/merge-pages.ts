import type { ExtractedQuestion, MergedQuestion, PageExtraction, QuestionKind } from "../schema.js";

interface PageInput {
  page: number;
  extraction: PageExtraction;
}

export interface MergeResult {
  questions: MergedQuestion[];
  /** Những chỗ đáng ngờ, đưa thẳng vào meta.json để người chấm biết chỗ cần soi. */
  warnings: string[];
}

/**
 * Ghép kết quả từng trang thành danh sách câu hỏi của cả đề:
 * - nối câu bị cắt ngang trang
 * - gắn đáp án từ bảng đáp án cuối đề
 */
export function mergePages(pages: PageInput[]): MergeResult {
  const sorted = [...pages].sort((a, b) => a.page - b.page);
  const questions: MergedQuestion[] = [];
  const warnings: string[] = [];

  for (const { page, extraction } of sorted) {
    if (extraction.isNonQuestionPage && extraction.questions.length > 0) {
      warnings.push(
        `Trang ${page}: model đánh dấu không phải trang câu hỏi nhưng vẫn trả về ${extraction.questions.length} câu`,
      );
    }

    for (const [indexOnPage, question] of extraction.questions.entries()) {
      const previous = questions.at(-1);
      const isFirstOnPage = indexOnPage === 0;
      const followsPreviousPage = previous ? previous.spansPages.at(-1) === page - 1 : false;

      // Chỉ ghép khi vị trí cho phép: câu đầu trang, nối tiếp đúng trang liền trước.
      // Hai cờ do hai lần gọi model độc lập sinh ra nên không tin tuyệt đối được;
      // thiếu ràng buộc vị trí thì một cờ sai sẽ dính hai câu khác nhau làm một.
      if (isFirstOnPage && previous && followsPreviousPage) {
        const claimedByPart = question.continuedFromPreviousPage;
        const claimedByPrevious = previous.continuesOnNextPage;

        if (claimedByPart || claimedByPrevious) {
          if (claimedByPart !== claimedByPrevious) {
            warnings.push(
              `Trang ${page}: chỉ một trong hai trang báo câu bị cắt ngang (trang trước: ${claimedByPrevious}, trang này: ${claimedByPart}) - đã ghép, cần kiểm tra`,
            );
          }
          appendContinuation(previous, question, page);
          continue;
        }
      } else if (question.continuedFromPreviousPage) {
        warnings.push(
          `Trang ${page}: câu thứ ${indexOnPage + 1} tự nhận là phần tiếp của trang trước nhưng không ở đầu trang - không ghép`,
        );
      }

      questions.push({
        ...question,
        page,
        spansPages: [page],
        figures: question.figures.map((figure) => ({ ...figure, page })),
        figureFiles: [],
        answerSource: question.answerKey ? "inline" : "none",
      });
    }
  }

  warnings.push(...applyAnswerTables(questions, sorted));
  warnings.push(...checkFormat(questions));
  return { questions, warnings };
}

function appendContinuation(target: MergedQuestion, part: ExtractedQuestion, page: number): void {
  target.stem = `${target.stem}\n${part.stem}`.trim();
  target.options.push(...part.options);
  target.trueFalseItems.push(...part.trueFalseItems);
  // Hình của phần tiếp nằm ở TRANG NÀY, phải giữ số trang riêng để cắt đúng ảnh.
  target.figures.push(...part.figures.map((figure) => ({ ...figure, page })));
  if (!target.answerKey && part.answerKey) {
    target.answerKey = part.answerKey;
    target.answerSource = "inline";
  }
  if (part.solution) {
    target.solution = `${target.solution}\n${part.solution}`.trim();
  }
  target.continuesOnNextPage = part.continuesOnNextPage;
  target.spansPages.push(page);
}

/** Phần của đề suy từ loại câu: đề THPT 2025 đánh số lại từ 1 ở mỗi phần. */
const PART_OF_KIND: Record<QuestionKind, string> = {
  mcq: "I",
  true_false: "II",
  short_answer: "III",
  essay: "TL",
};

function normalizePart(part: string, answer: string): string {
  const normalized = part.trim().toUpperCase().replace(/^PHẦN\s*/u, "");
  if (["I", "II", "III", "TL"].includes(normalized)) return normalized;

  // Bảng không ghi phần: suy từ dạng đáp án.
  const value = answer.trim().toUpperCase();
  if (/^[A-D]$/.test(value)) return "I";
  if (/^[ĐDS]{4}$/.test(value)) return "II";
  return "III";
}

/**
 * Gắn đáp án từ bảng đáp án cuối đề.
 * Khoá là (phần, số câu) chứ không phải số câu trần: "Câu 1" xuất hiện ở cả ba
 * phần, khoá theo số trần sẽ để đáp án Phần III ghi đè lên Phần I.
 */
function applyAnswerTables(questions: MergedQuestion[], pages: PageInput[]): string[] {
  const warnings: string[] = [];
  const table = new Map<string, string>();

  for (const { page, extraction } of pages) {
    for (const row of extraction.answerKeyTable) {
      if (!row.number?.trim() || !row.answer?.trim()) continue;
      const key = `${normalizePart(row.part ?? "", row.answer)}:${row.number.trim()}`;
      const existing = table.get(key);
      if (existing && existing !== row.answer.trim()) {
        warnings.push(
          `Bảng đáp án (trang ${page}): khoá ${key} có hai giá trị khác nhau ('${existing}' và '${row.answer.trim()}') - bỏ qua cả hai`,
        );
        table.set(key, "");
        continue;
      }
      table.set(key, row.answer.trim());
    }
  }
  if (table.size === 0) return warnings;

  const used = new Set<string>();
  for (const question of questions) {
    if (question.answerKey || !question.number.trim()) continue;
    const key = `${PART_OF_KIND[question.kind]}:${question.number.trim()}`;
    const answer = table.get(key);
    if (answer) {
      question.answerKey = answer;
      question.answerSource = "answer_table";
      used.add(key);
    }
  }

  const unmatched = [...table.keys()].filter((key) => !used.has(key) && table.get(key));
  if (unmatched.length > 0) {
    warnings.push(
      `Bảng đáp án có ${unmatched.length} dòng không khớp câu nào: ${unmatched.slice(0, 12).join(", ")}`,
    );
  }
  return warnings;
}

/** Kiểm tra các bất biến của format THPT 2025 - tín hiệu rẻ về chất lượng model. */
function checkFormat(questions: MergedQuestion[]): string[] {
  const warnings: string[] = [];
  const seen = new Map<string, number>();

  for (const [index, question] of questions.entries()) {
    const at = `Câu thứ ${index + 1} (số '${question.number || "?"}', trang ${question.page})`;

    if (!question.number.trim()) warnings.push(`${at}: không có số câu`);
    if (question.kind === "mcq" && question.options.length !== 4) {
      warnings.push(`${at}: câu nhiều lựa chọn nhưng có ${question.options.length} phương án`);
    }
    if (question.kind === "true_false" && question.trueFalseItems.length !== 4) {
      warnings.push(`${at}: câu Đúng/Sai nhưng có ${question.trueFalseItems.length} ý`);
    }
    if (question.kind === "mcq" && question.answerKey && !/^[A-D]$/.test(question.answerKey)) {
      warnings.push(`${at}: đáp án '${question.answerKey}' không phải A–D`);
    }
    if (
      question.kind === "true_false" &&
      question.answerKey &&
      !/^[ĐDS]{4}$/iu.test(question.answerKey)
    ) {
      warnings.push(`${at}: đáp án '${question.answerKey}' không phải 4 ký tự Đ/S`);
    }
    if (question.kind === "short_answer" && question.answerKey.length > 4) {
      warnings.push(`${at}: đáp số '${question.answerKey}' dài hơn 4 ký tự`);
    }

    if (question.number.trim()) {
      const key = `${PART_OF_KIND[question.kind]}:${question.number.trim()}`;
      const previousIndex = seen.get(key);
      if (previousIndex !== undefined) {
        warnings.push(`${at}: trùng số câu với câu thứ ${previousIndex + 1} trong cùng phần`);
      }
      seen.set(key, index);
    }
  }
  return warnings;
}
