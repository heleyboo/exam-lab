import { cn } from "@/lib/cn";

/** Bục vinh danh ba vị trí đầu bảng xếp hạng. */
export function Podium({
  entries,
  className,
}: {
  entries: { rank: 1 | 2 | 3; name: string; school?: string; points: number }[];
  className?: string;
}) {
  const ordered = [...entries].sort((a, b) => a.rank - b.rank);
  return (
    <ol className={cn("flex items-end justify-center gap-4", className)}>
      {ordered.map((entry) => (
        <li
          key={entry.rank}
          className={cn(
            "flex w-28 flex-col items-center rounded-xl border bg-[var(--color-surface)] p-3 text-center",
            entry.rank === 1
              ? "scale-105 border-[var(--color-accent)]"
              : "border-[var(--color-line)]",
          )}
        >
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold">
            #{entry.rank}
          </span>
          <span className="mt-1 truncate text-sm font-medium">{entry.name}</span>
          {entry.school && (
            <span className="truncate text-[11px] text-[var(--color-ink-3)]">{entry.school}</span>
          )}
          <span className="mt-1 font-mono text-xs tabular-nums">
            {entry.points.toLocaleString("vi-VN")} điểm
          </span>
        </li>
      ))}
    </ol>
  );
}
