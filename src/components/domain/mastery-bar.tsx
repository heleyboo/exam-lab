import { cn } from "@/lib/cn";
import { masteryBand, shouldShowMastery } from "@/lib/mastery";

const BAND_CLASS = {
  weak: "bg-[var(--color-bad)]",
  medium: "bg-[var(--color-warn)]",
  strong: "bg-[var(--color-ok)]",
} as const;

/**
 * Thanh độ thành thạo. Màu đổi theo ngưỡng 45% và 70% lấy từ `src/lib/mastery`,
 * không tự đặt ngưỡng ở đây: đó là quyết định sản phẩm dùng chung nhiều nơi.
 */
export function MasteryBar({
  score,
  attempts,
  label,
  className,
}: {
  score: number;
  attempts: number;
  label: string;
  className?: string;
}) {
  const ready = shouldShowMastery(attempts);
  const band = masteryBand(score);
  const rounded = Math.round(score);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate">{label}</span>
        <span className={cn("shrink-0 tabular-nums", !ready && "text-[var(--color-ink-3)]")}>
          {ready ? `${rounded}%` : `cần ${5 - attempts} câu nữa`}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]"
        role="progressbar"
        aria-label={`Độ thành thạo ${label}`}
        aria-valuenow={ready ? rounded : 0}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full", ready ? BAND_CLASS[band] : "bg-[var(--color-line)]")}
          style={{ width: `${ready ? rounded : 0}%` }}
        />
      </div>
    </div>
  );
}
