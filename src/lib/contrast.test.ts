import { describe, expect, it } from "vitest";

/**
 * Đo tương phản của bộ màu theo WCAG.
 *
 * Kiểm bằng mắt thì ai cũng bảo "nhìn ổn". Đây là phép đo thật, chạy lại mỗi
 * lần đổi màu, để không vô tình làm chữ khó đọc trên nền nhạt.
 */

const LIGHT = {
  bg: "#fbf5ef",
  surface: "#ffffff",
  "surface-2": "#f8f0e8",
  ink: "#12283d",
  "ink-2": "#4a5a6e",
  "ink-3": "#8a94a2",
  accent: "#1b5a8c",
  "accent-soft": "#e4eef8",
  ok: "#1b7550",
  "ok-soft": "#e1f0e8",
  bad: "#b83b35",
  "bad-soft": "#fbe7e4",
  warn: "#935f07",
  "warn-soft": "#fbefda",
  ai: "#66399b",
  "ai-soft": "#f0e9f8",
} as const;

const DARK = {
  bg: "#111419",
  surface: "#171b22",
  "surface-2": "#1e232b",
  ink: "#eceef2",
  "ink-2": "#a6aebc",
  "ink-3": "#78808e",
  accent: "#79a6ec",
  "accent-soft": "#1b2735",
  ok: "#4fbe85",
  "ok-soft": "#13271d",
  bad: "#ef8b81",
  "bad-soft": "#2a1816",
  warn: "#ddac59",
  "warn-soft": "#282013",
  ai: "#b995e9",
  "ai-soft": "#211a2f",
} as const;

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/** Cặp màu chữ trên nền, phải đạt 4.5:1 cho chữ thường. */
const TEXT_PAIRS: [keyof typeof LIGHT, keyof typeof LIGHT][] = [
  ["ink", "bg"],
  ["ink", "surface"],
  ["ink", "surface-2"],
  ["ink-2", "bg"],
  ["ink-2", "surface"],
  ["accent", "surface"],
  ["accent", "accent-soft"],
  ["ok", "ok-soft"],
  ["bad", "bad-soft"],
  ["warn", "warn-soft"],
  ["ai", "ai-soft"],
];

describe("tương phản màu đạt chuẩn WCAG AA", () => {
  it("nền sáng: chữ trên nền đạt tối thiểu 4,5:1", () => {
    for (const [fg, bg] of TEXT_PAIRS) {
      const ratio = contrastRatio(LIGHT[fg], LIGHT[bg]);
      expect(ratio, `${fg} trên ${bg} chỉ đạt ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("nền tối: chữ trên nền đạt tối thiểu 4,5:1", () => {
    for (const [fg, bg] of TEXT_PAIRS) {
      const ratio = contrastRatio(DARK[fg], DARK[bg]);
      expect(ratio, `${fg} trên ${bg} chỉ đạt ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("chữ phụ mờ vẫn đạt 3:1 cho chữ lớn", () => {
    // ink-3 dùng cho nhãn nhỏ in hoa và chú thích, không dùng cho nội dung chính.
    expect(contrastRatio(LIGHT["ink-3"], LIGHT.surface)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(DARK["ink-3"], DARK.surface)).toBeGreaterThanOrEqual(3);
  });
});
