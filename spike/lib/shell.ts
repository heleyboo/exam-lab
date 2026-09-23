import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Chạy một CLI ngoài (pdftoppm, pdffonts, magick, pandoc).
 * Ném lỗi kèm stderr để spike báo đúng nguyên nhân thay vì im lặng bỏ qua.
 */
export async function run(cmd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(cmd, args, { maxBuffer: 64 * 1024 * 1024 });
    return stdout;
  } catch (error) {
    const err = error as { stderr?: string; message?: string; code?: string };
    if (err.code === "ENOENT") {
      throw new Error(`Thiếu công cụ '${cmd}'. Cài bằng: brew install poppler imagemagick pandoc`);
    }
    throw new Error(`Lệnh '${cmd} ${args.join(" ")}' lỗi: ${err.stderr || err.message}`);
  }
}
