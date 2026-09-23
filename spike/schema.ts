import { z } from "zod";

/** Loại câu theo cấu trúc đề thi tốt nghiệp THPT từ 2025. */
export const QuestionKind = z.enum(["mcq", "true_false", "short_answer", "essay"]);
export type QuestionKind = z.infer<typeof QuestionKind>;

/**
 * Vùng hình trên trang, lưu theo phần trăm kích thước trang.
 * Dùng % thay vì pixel để zoom và đổi DPI không làm lệch khung.
 * Không ràng buộc 0–100 ở đây: một toạ độ model đoán sai không được phép
 * làm hỏng cả trang, việc cắt hình đã tự kẹp giá trị về vùng hợp lệ.
 */
export const FigureRect = z.object({
  left: z.number(),
  top: z.number(),
  width: z.number(),
  height: z.number(),
  caption: z.string(),
});

export const McqOption = z.object({
  key: z.enum(["A", "B", "C", "D"]),
  text: z.string(),
});

/** Một ý trong câu Đúng/Sai (4 ý a–d). */
export const TrueFalseItem = z.object({
  key: z.enum(["a", "b", "c", "d"]),
  text: z.string(),
});

export const ExtractedQuestion = z.object({
  /** Số thứ tự câu in trên đề, ví dụ "5". Rỗng nếu không đọc được. */
  number: z.string(),
  kind: QuestionKind,
  /** Đề bài dạng Markdown, công thức bọc trong $...$ hoặc $$...$$. */
  stem: z.string(),
  options: z.array(McqOption),
  trueFalseItems: z.array(TrueFalseItem),
  /**
   * Đáp án đọc được ngay trên trang.
   * mcq: "B" · true_false: "DDSD" · short_answer: "2,5" · essay: rỗng.
   */
  answerKey: z.string(),
  /** Lời giải nếu đề có in kèm. Rỗng nếu không có. */
  solution: z.string(),
  figures: z.array(FigureRect),
  continuesOnNextPage: z.boolean(),
  continuedFromPreviousPage: z.boolean(),
});
export type ExtractedQuestion = z.infer<typeof ExtractedQuestion>;
export type FigureRect = z.infer<typeof FigureRect>;

/** Kết quả model trả về cho MỘT trang. */
export const PageExtraction = z.object({
  /** true khi trang chỉ có bìa, hướng dẫn, hoặc bảng đáp án. */
  isNonQuestionPage: z.boolean(),
  /** Bảng đáp án in trên trang này. `part` để phân biệt Phần I/II/III vì đề THPT 2025 đánh số lại từ 1 ở mỗi phần. */
  answerKeyTable: z.array(
    z.object({ part: z.string(), number: z.string(), answer: z.string() }),
  ),
  questions: z.array(ExtractedQuestion),
});
export type PageExtraction = z.infer<typeof PageExtraction>;

/** Hình đã gắn số trang, cần cho việc cắt đúng ảnh khi câu trải qua nhiều trang. */
export const MergedFigure = FigureRect.extend({ page: z.number().int().positive() });
export type MergedFigure = z.infer<typeof MergedFigure>;

/** Câu hỏi sau khi ghép trang và gắn đáp án, ghi ra questions.json. */
export const MergedQuestion = ExtractedQuestion.omit({ figures: true }).extend({
  /** Trang chứa phần đầu của câu, đánh số từ 1. */
  page: z.number().int().positive(),
  spansPages: z.array(z.number().int().positive()),
  figures: z.array(MergedFigure),
  /** Đường dẫn tương đối tới ảnh hình đã cắt. */
  figureFiles: z.array(z.string()),
  answerSource: z.enum(["inline", "answer_table", "none"]),
});
export type MergedQuestion = z.infer<typeof MergedQuestion>;

export const SourceKind = z.enum(["pdf-digital", "pdf-scan", "docx"]);
export type SourceKind = z.infer<typeof SourceKind>;

/** meta.json - đọc và ghi đều đi qua schema này để không lệch giữa hai đầu. */
export const RunMeta = z.object({
  source: z.string(),
  sourceKind: SourceKind,
  /** Bằng chứng của việc phân loại scan/số, để kiểm lại khi nghi heuristic sai. */
  sourceKindEvidence: z.object({
    embeddedFontLines: z.number(),
    textLength: z.number(),
    overridden: z.boolean(),
  }),
  /** null với docx: không có khái niệm trang nên không đo được chi phí mỗi trang. */
  pages: z.number().nullable(),
  questionCount: z.number(),
  byKind: z.record(z.string(), z.number()),
  withAnswer: z.number(),
  withFigures: z.number(),
  failedPages: z.array(z.object({ page: z.number(), error: z.string() })),
  warnings: z.array(z.string()),
  config: z.object({
    model: z.string(),
    dpi: z.number(),
    preprocess: z.enum(["auto", "on", "off"]),
    usdToVnd: z.number(),
  }),
  promptVersion: z.string(),
  usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }),
  cost: z.object({ usd: z.number(), vnd: z.number() }),
  costPerPageVnd: z.number().nullable(),
  costPerQuestionVnd: z.number().nullable(),
  durationMs: z.number(),
  extractedAt: z.string(),
  complete: z.boolean(),
});
export type RunMeta = z.infer<typeof RunMeta>;

const Judgement = z.union([z.boolean(), z.null()]);

/** Một dòng chấm tay trong labels.json. */
export const Label = z.object({
  index: z.number(),
  number: z.string(),
  kind: QuestionKind,
  preview: z.string(),
  /** Số hình harness đã cắt cho câu này, để người chấm phân biệt "đề không có hình" với "model bỏ sót hình". */
  croppedFigures: z.number(),
  /** Số hình câu này thực sự có trên đề gốc. Người chấm điền. */
  expectedFigures: z.number().nullable(),
  boundaryOk: Judgement,
  kindOk: Judgement,
  latexOk: Judgement,
  figureOk: Judgement,
  answerOk: Judgement,
  note: z.string(),
});
export type Label = z.infer<typeof Label>;

/**
 * labels.json gắn chặt với một lần chạy cụ thể.
 * Thiếu ràng buộc này thì rất dễ chấm bản cũ rồi báo cáo cho bản mới.
 */
export const LabelFile = z.object({
  boundTo: z.object({
    source: z.string(),
    promptVersion: z.string(),
    extractedAt: z.string(),
    questionCount: z.number(),
  }),
  /** Tổng số câu THỰC SỰ có trên đề gốc. Người chấm đếm tay một lần. */
  expectedQuestionCount: z.number().nullable(),
  rows: z.array(Label),
});
export type LabelFile = z.infer<typeof LabelFile>;
