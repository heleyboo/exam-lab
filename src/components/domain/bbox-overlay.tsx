"use client";

import { cn } from "@/lib/cn";

export interface BBox {
  id: string;
  label: string;
  /** Khung theo phần trăm kích thước trang: zoom hay đổi DPI đều không lệch. */
  left: number;
  top: number;
  width: number;
  height: number;
  state?: "selected" | "duplicate" | "idle";
}

const BOX_CLASS = {
  selected: "border-[var(--color-accent)] bg-[var(--color-accent)]/10",
  duplicate: "border-[var(--color-bad)] bg-[var(--color-bad)]/10",
  idle: "border-[var(--color-ink-3)] bg-transparent",
} as const;

/**
 * Ảnh trang đề kèm khung từng câu, dùng ở màn soát đề.
 *
 * Toạ độ tính theo phần trăm nên ảnh phóng to thu nhỏ thế nào khung vẫn khớp.
 * Khung là nút bấm được để chọn câu tương ứng ở danh sách bên cạnh.
 */
export function BBoxOverlay({
  pageImageUrl,
  pageLabel,
  boxes,
  onSelect,
  className,
}: {
  pageImageUrl: string;
  pageLabel: string;
  boxes: BBox[];
  onSelect?: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg border border-[var(--color-line)] bg-white",
        className,
      )}
      style={{ aspectRatio: "210 / 297" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={pageImageUrl} alt={pageLabel} className="size-full object-contain" />
      {boxes.map((box) => (
        <button
          key={box.id}
          type="button"
          onClick={() => onSelect?.(box.id)}
          aria-label={`Chọn ${box.label}`}
          className={cn(
            "absolute rounded border-2 transition-colors",
            BOX_CLASS[box.state ?? "idle"],
          )}
          style={{
            left: `${box.left}%`,
            top: `${box.top}%`,
            width: `${box.width}%`,
            height: `${box.height}%`,
          }}
        >
          <span className="absolute -top-5 left-0 rounded bg-[var(--color-ink)] px-1.5 py-0.5 text-[10px] text-white">
            {box.label}
          </span>
        </button>
      ))}
    </div>
  );
}
