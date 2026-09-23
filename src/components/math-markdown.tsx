import { renderMathMarkdown } from "@/lib/math/render";
import { cn } from "@/lib/cn";

/**
 * Hiển thị đề bài và lời giải: Markdown kèm công thức LaTeX.
 * Là Server Component nên HTML có sẵn trong trang, không cần JavaScript.
 */
export async function MathMarkdown({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  const html = await renderMathMarkdown(source);
  return (
    <div
      className={cn("leading-[1.75] [&_p]:my-2 [&_table]:w-full [&_table]:text-sm", className)}
      // Nội dung đã qua rehype-sanitize ở render.ts.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
