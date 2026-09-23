import { cn } from "@/lib/cn";

/** Ô nhiệt 8 tuần trên màn tổng quan học sinh. 0 là không làm câu nào. */
export function HeatmapWeeks({
  days,
  weeks = 8,
  className,
}: {
  /** Mảng theo thứ tự thời gian, mỗi phần tử một ngày. */
  days: { level: 0 | 1 | 2 | 3 | 4; label: string }[];
  weeks?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, gridAutoFlow: "column" }}
        role="img"
        aria-label={`Hoạt động ${weeks} tuần gần đây, ${days.filter((d) => d.level > 0).length} ngày có làm bài`}
      >
        {days.map((day, index) => (
          <span
            key={index}
            title={day.label}
            className="aspect-square rounded-[3px]"
            style={{
              backgroundColor:
                day.level === 0
                  ? "var(--color-surface-2)"
                  : `color-mix(in srgb, var(--color-accent) ${25 + day.level * 25}%, transparent)`,
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-3)]">
        <span>ít</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className="size-3 rounded-[3px]"
            style={{
              backgroundColor:
                level === 0
                  ? "var(--color-surface-2)"
                  : `color-mix(in srgb, var(--color-accent) ${25 + level * 25}%, transparent)`,
            }}
          />
        ))}
        <span>nhiều</span>
      </div>
    </div>
  );
}
