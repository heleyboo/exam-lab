import { cn } from "@/lib/cn";

/**
 * Dải thông báo cho mọi thứ do AI sinh ra.
 *
 * Luôn dùng màu tím riêng của AI và luôn nói rõ giới hạn. Người dùng phải phân
 * biệt được đâu là nội dung máy làm, đâu là nội dung người đã duyệt.
 */
export function AiNotice({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-ai)] bg-[var(--color-ai-soft)] px-4 py-3",
        className,
      )}
    >
      <span className="rounded-full bg-[var(--color-ai)] px-2.5 py-1 text-[11px] font-medium text-white">
        {title}
      </span>
      {children && <span className="flex-1 text-sm text-[var(--color-ink-2)]">{children}</span>}
      {action}
    </div>
  );
}
