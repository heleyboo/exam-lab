"use server";

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { requireRole } from "@/server/auth/session";
import { ROUTE_GROUP_ROLES } from "@/server/auth/roles";
import { createImport } from "@/server/services/create-import";
import { revalidatePath } from "next/cache";

/** Kích thước tối đa, khớp giới hạn ghi trên giao diện. */
const MAX_BYTES = 40 * 1024 * 1024;

export type UploadState = { message: string; tone: "ok" | "bad" } | null;

export async function uploadExam(_prev: UploadState, formData: FormData): Promise<UploadState> {
  // Kiểm quyền ở server cho từng hành động, không dựa vào việc ẩn nút trên giao diện.
  const user = await requireRole(ROUTE_GROUP_ROLES.admin);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { message: "Chưa chọn file đề", tone: "bad" };
  }
  if (file.size > MAX_BYTES) {
    return { message: `File ${(file.size / 1024 / 1024).toFixed(1)} MB, vượt giới hạn 40 MB`, tone: "bad" };
  }

  const examName = String(formData.get("examName") ?? "").trim();
  if (!examName) return { message: "Chưa nhập tên kỳ thi", tone: "bad" };

  const bytes = Buffer.from(await file.arrayBuffer());

  // Worker là process riêng nên nhận file qua đĩa chung, không qua bộ nhớ.
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "examlab-upload-"));
  const workerFilePath = path.join(dir, file.name);
  await fs.writeFile(workerFilePath, bytes);

  const year = Number(formData.get("year"));
  const grade = Number(formData.get("grade"));

  const result = await createImport({
    fileName: file.name,
    fileBytes: bytes,
    workerFilePath,
    examName,
    school: String(formData.get("school") ?? "").trim() || undefined,
    year: Number.isFinite(year) && year > 0 ? year : undefined,
    grade: Number.isFinite(grade) && grade > 0 ? grade : undefined,
    examCode: String(formData.get("examCode") ?? "").trim() || undefined,
    visibility: formData.get("visibility") === "public" ? "public" : "restricted",
    uploadedBy: user.id,
    skipDedupe: formData.get("skipDedupe") === "on",
  });

  revalidatePath("/quan-tri/nap-de");

  if (result.status === "duplicate_file") {
    return { message: `File này đã nạp rồi: "${result.examName}". Không nạp lại.`, tone: "bad" };
  }
  return { message: "Đã xếp vào hàng đợi. Theo dõi tiến trình bên dưới.", tone: "ok" };
}
