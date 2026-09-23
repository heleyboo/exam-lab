import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

/**
 * Chuyển Markdown kèm LaTeX thành HTML, chạy phía server.
 *
 * Prototype quét toàn bộ DOM rồi render bằng JavaScript sau mỗi lần cập nhật.
 * Cách đó không hợp với React và làm công thức biến mất khi tắt JavaScript.
 * Ở đây render sẵn thành HTML nên trang tĩnh cũng hiện đúng công thức.
 */

/**
 * Nội dung câu hỏi đến từ model và từ người nhập, tức là dữ liệu không tin
 * được. Phải làm sạch, nhưng vẫn giữ các thẻ và thuộc tính KaTeX cần để hiển
 * thị công thức.
 */
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "style"],
    span: [...(defaultSchema.attributes?.span ?? []), "className", "style", "ariaHidden"],
    math: ["xmlns", "display"],
    annotation: ["encoding"],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    // Thẻ MathML do KaTeX sinh ra.
    "math",
    "semantics",
    "mrow",
    "mi",
    "mn",
    "mo",
    "msup",
    "msub",
    "msubsup",
    "mfrac",
    "msqrt",
    "mroot",
    "mtext",
    "mspace",
    "mtable",
    "mtr",
    "mtd",
    "munder",
    "mover",
    "munderover",
    "annotation",
    "mstyle",
    "mpadded",
    "mphantom",
    "menclose",
  ],
};

const processor = unified()
  .use(remarkParse)
  // Bảng: đề thi thật có bảng tần số, bảng biến thiên. remark-parse không hiểu
  // cú pháp bảng nếu thiếu plugin này, và bảng sẽ biến mất không báo lỗi.
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype)
  // Công thức hỏng thì in mã gốc màu đỏ, không ném lỗi làm vỡ cả trang.
  .use(rehypeKatex, { throwOnError: false, errorColor: "var(--bad)", strict: false })
  .use(rehypeSanitize, schema)
  .use(rehypeStringify);

/**
 * `$$...$$` viết gọn trên một dòng bị remark-math coi là công thức nội dòng,
 * hiển thị nhỏ và không căn giữa. Prompt trích xuất sinh ra đúng dạng viết gọn
 * này, nên tách ra thành ba dòng trước khi parse.
 */
function expandDisplayMath(source: string): string {
  return source.replace(/^[ \t]*\$\$(.+?)\$\$[ \t]*$/gmu, (_match, body: string) => {
    return `$$\n${body.trim()}\n$$`;
  });
}

export async function renderMathMarkdown(source: string): Promise<string> {
  const file = await processor.process(expandDisplayMath(source));
  return String(file);
}
