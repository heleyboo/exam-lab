import { cn } from "@/lib/cn";

/**
 * Ba trạng thái mà prototype không có màn nào: rỗng, đang tải, lỗi.
 *
 * Prototype lúc nào cũng đầy dữ liệu nên không lộ ra việc thiếu. Trong sản phẩm
 * thật thì danh sách rỗng và lỗi mạng là chuyện hằng ngày.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--color-line)] px-6 py-10 text-center",
        className,
      )}
    >
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-[var(--color-ink-2)]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Có lỗi xảy ra",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-[var(--color-bad)] bg-[var(--color-bad-soft)] px-6 py-8 text-center",
        className,
      )}
    >
      <p className="font-medium text-[var(--color-bad)]">{title}</p>
      {description && <p className="text-sm text-[var(--color-ink-2)]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Khung xám trong lúc chờ dữ liệu. Không dùng chữ "Đang tải..." vì nhảy layout. */
export function LoadingSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Đang tải nội dung</span>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="h-4 animate-pulse rounded bg-[var(--color-surface-2)]"
          style={{ width: `${100 - index * 12}%` }}
        />
      ))}
    </div>
  );
}
