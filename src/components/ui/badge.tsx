import { cn } from "@/lib/cn";
import { TONE_CLASS, type Tone, type ToneLabel } from "@/lib/tone";

/**
 * Chip trạng thái. Màu lấy từ từ điển tone, không truyền màu tuỳ ý:
 * "Lệch đáp án" phải đỏ ở mọi màn hình.
 */
export function Badge({
  tone = "muted",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[5px] px-2 py-1 text-[10.5px] leading-none font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Dạng tiện dùng khi đã có sẵn cặp nhãn và tông màu từ từ điển. */
export function StatusBadge({ status, className }: { status: ToneLabel; className?: string }) {
  return (
    <Badge tone={status.tone} className={className}>
      {status.label}
    </Badge>
  );
}
