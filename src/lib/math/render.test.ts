import { describe, expect, it } from "vitest";
import { renderMathMarkdown } from "./render";

describe("render đề bài Markdown kèm LaTeX", () => {
  it("render công thức nội dòng thành HTML sẵn, không cần JavaScript", async () => {
    const html = await renderMathMarkdown("Cho hàm số $y=x^2+1$.");
    expect(html).toContain("katex");
    expect(html).toContain("x^2+1");
  });

  it("render công thức riêng dòng", async () => {
    const html = await renderMathMarkdown("$$\\int_{1}^{2} x\\,dx$$");
    expect(html).toContain("katex-display");
  });

  it("công thức hỏng in ra mã gốc thay vì ném lỗi", async () => {
    // Đề nhập từ ảnh chắc chắn có công thức hỏng; một câu hỏng không được làm
    // vỡ cả trang danh sách.
    const html = await renderMathMarkdown("Công thức hỏng: $\\frac{1}{$");
    expect(html).toContain("katex-error");
  });

  it("render bảng, vì đề thi có bảng tần số và bảng biến thiên", async () => {
    const html = await renderMathMarkdown(
      ["| Nhóm | $[0;40)$ |", "|---|---|", "| Tần số | 11 |"].join("\n"),
    );
    expect(html).toContain("<table>");
    expect(html).toContain("<th>");
  });

  it("giữ nguyên dấu tiếng Việt", async () => {
    const html = await renderMathMarkdown("Tứ phân vị thứ ba của mẫu số liệu ghép nhóm");
    expect(html).toContain("Tứ phân vị thứ ba");
  });

  it("loại bỏ script và thuộc tính sự kiện", async () => {
    // Nội dung đến từ model và từ người nhập, tức là dữ liệu không tin được.
    const html = await renderMathMarkdown(
      '<script>alert(1)</script><img src=x onerror="alert(2)">',
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
  });

  it("giữ thẻ MathML mà KaTeX cần", async () => {
    const html = await renderMathMarkdown("$x$");
    expect(html).toContain("<math");
    expect(html).toContain("annotation");
  });
});
