"use client";

import { cn } from "@/lib/cn";

/**
 * Ô nhập số câu trong ma trận đề.
 *
 * Ma trận ba chiều: chủ đề nhân mức độ nhân loại câu. Mỗi ô cần nhãn riêng cho
 * trình đọc màn hình, vì nhìn bằng mắt thì cột và hàng nói lên ý nghĩa còn đọc
 * tuần tự thì không.
 */
export function MatrixCell({
  value,
  onChange,
  pointsPerQuestion,
  topicLabel,
  levelLabel,
  kindLabel,
  warning,
}: {
  value: number;
  onChange: (value: number) => void;
  pointsPerQuestion: number;
  topicLabel: string;
  levelLabel: string;
  kindLabel: string;
  /** Kho không đủ câu cho ô này. */
  warning?: boolean;
}) {
  const id = `matrix-${topicLabel}-${levelLabel}-${kindLabel}`.replace(/\s+/gu, "-");
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={id} className="sr-only">
        {`${topicLabel}, ${levelLabel}, ${kindLabel}`}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        max={20}
        value={value}
        onChange={(event) => onChange(Math.max(0, Math.min(20, Number(event.target.value) || 0)))}
        className={cn(
          "w-12 rounded-md border bg-[var(--color-surface)] px-2 py-1.5 text-center tabular-nums",
          warning ? "border-[var(--color-warn)]" : "border-[var(--color-line)]",
        )}
      />
      <span className="text-[11px] text-[var(--color-ink-3)] tabular-nums">
        ×{pointsPerQuestion.toLocaleString("vi-VN")}
      </span>
    </div>
  );
}
