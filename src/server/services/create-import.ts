import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { importJob, sourceExam } from "../db/schema";
import { sendJob } from "../jobs/queue";
import { putObject } from "../storage";

/**
 * Nhận file đề rồi xếp vào hàng đợi.
 *
 * Tách khỏi `runImport` vì đây là phần chạy trong vòng đời request của web app:
 * phải trả lời nhanh, không được đợi model.
 */

export interface CreateImportInput {
  fileName: string;
  fileBytes: Buffer;
  /** Đường dẫn file tạm mà worker đọc được. */
  workerFilePath: string;
  examName: string;
  school?: string | undefined;
  year?: number | undefined;
  grade?: number | undefined;
  examCode?: string | undefined;
  /** Đề của Bộ là công khai, đề trường/sở là hạn chế. */
  visibility: "public" | "restricted";
  uploadedBy?: string | undefined;
  skipDedupe?: boolean;
}

export type CreateImportResult =
  | { status: "queued"; sourceExamId: string; jobId: string }
  /** File này đã nạp rồi, không nạp lại để khỏi sinh câu trùng. */
  | { status: "duplicate_file"; sourceExamId: string; examName: string };

async function nextShortCode(): Promise<string> {
  const rows = await db.select({ id: sourceExam.id }).from(sourceExam);
  return `E-${String(rows.length + 1).padStart(4, "0")}`;
}

export async function createImport(input: CreateImportInput): Promise<CreateImportResult> {
  // Checksum của nội dung file, không phải tên file: cùng một đề đổi tên vẫn là
  // một đề, và nạp hai lần sẽ nhân đôi cả kho câu hỏi.
  const checksum = createHash("sha256").update(input.fileBytes).digest("hex");

  const [existing] = await db
    .select({ id: sourceExam.id, examName: sourceExam.examName })
    .from(sourceExam)
    .where(eq(sourceExam.fileChecksum, checksum))
    .limit(1);
  if (existing) {
    return { status: "duplicate_file", sourceExamId: existing.id, examName: existing.examName };
  }

  const storageKey = `source-exams/original/${checksum}${input.fileName.match(/\.[a-z]+$/i)?.[0] ?? ""}`;
  await putObject(storageKey, input.fileBytes, "application/octet-stream");

  const [exam] = await db
    .insert(sourceExam)
    .values({
      shortCode: await nextShortCode(),
      examName: input.examName,
      ...(input.school ? { school: input.school } : {}),
      ...(input.year ? { year: input.year } : {}),
      ...(input.grade ? { grade: input.grade } : {}),
      ...(input.examCode ? { examCode: input.examCode } : {}),
      visibility: input.visibility,
      storageKey,
      fileChecksum: checksum,
      ...(input.uploadedBy ? { uploadedBy: input.uploadedBy } : {}),
      status: "draft",
    })
    .returning({ id: sourceExam.id });
  if (!exam) throw new Error("Không tạo được bản ghi đề nguồn");

  const [job] = await db
    .insert(importJob)
    .values({ sourceExamId: exam.id, step: "upload", state: "pending" })
    .returning({ id: importJob.id });
  if (!job) throw new Error("Không tạo được job nạp đề");

  await sendJob("importExam", {
    jobId: job.id,
    sourceExamId: exam.id,
    filePath: input.workerFilePath,
    ...(input.examCode ? { examCode: input.examCode } : {}),
    ...(input.skipDedupe !== undefined ? { skipDedupe: input.skipDedupe } : {}),
  });

  return { status: "queued", sourceExamId: exam.id, jobId: job.id };
}
