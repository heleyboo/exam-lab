"use client";

import { cn } from "@/lib/cn";
import { SHORT_ANSWER_MAX_LENGTH } from "@/lib/scoring";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "0", ","] as const;

/**
 * Bàn phím số cho câu trả lời ngắn.
 *
 * Đáp số theo format THPT 2025 không quá 4 ký tự và dùng dấu phẩy thập phân.
 * Bàn phím riêng để học sinh trên điện thoại không phải đổi qua lại bàn phím số.
 */
export function NumericKeypad({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  function press(key: string) {
    if (value.length >= SHORT_ANSWER_MAX_LENGTH) return;
    onChange(value + key);
  }

  return (
    <div className={cn("grid w-max grid-cols-3 gap-2", className)}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          className="size-11 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] font-[family-name:var(--font-display)] text-base hover:border-[var(--color-accent)]"
        >
          {key}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(value.slice(0, -1))}
        aria-label="Xoá ký tự cuối"
        className="col-span-3 h-11 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] text-sm"
      >
        ⌫ Xoá
      </button>
    </div>
  );
}
