import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { FigureRect } from "../schema.js";

/**
 * Cắt hình theo khung phần trăm mà model trả về.
 * Khung được nới thêm một lề nhỏ vì model hay cắt sát mép hình.
 */
export async function cropFigure(
  sourceImage: string,
  rect: FigureRect,
  outPath: string,
  marginPercent = 1,
): Promise<void> {
  const image = sharp(sourceImage);
  const meta = await image.metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`Không đọc được kích thước ảnh ${sourceImage}`);
  }

  // Kẹp vào vùng hợp lệ và chừa chỗ cho khung tối thiểu: model đôi khi trả về
  // toạ độ sát mép hoặc vượt 100, không được để việc đó ném lỗi cả trang.
  const left = clamp(rect.left - marginPercent, 0, 99);
  const top = clamp(rect.top - marginPercent, 0, 99);
  const width = clamp(rect.width + marginPercent * 2, 1, 100 - left);
  const height = clamp(rect.height + marginPercent * 2, 1, 100 - top);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await image
    .extract({
      left: Math.round((left / 100) * meta.width),
      top: Math.round((top / 100) * meta.height),
      width: Math.max(1, Math.round((width / 100) * meta.width)),
      height: Math.max(1, Math.round((height / 100) * meta.height)),
    })
    .png()
    .toFile(outPath);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
