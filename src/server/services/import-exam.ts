import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  importJob,
  question,
  questionAnswerKey,
  questionFigure,
  questionOption,
  questionShortAnswer,
  questionTrueFalseItem,
  sourceExam,
  aiUsageLog,
} from "../db/schema";
import { detectSourceKind, pageCount, renderPdfPages, rotateImage } from "../extraction/render-pdf";
import { cropFigure } from "../extraction/crop-figures";
import { mergePages } from "../extraction/merge-pages";
import { aiDetectOrientation, aiExtractPage, type AiCall } from "../ai/adapter";
import { embedQuestions } from "../ai/embedding";
import { findMostSimilar } from "./dedupe";
import { putObject } from "../storage";
import type { PageExtraction } from "../extraction/schema";

/**
 * Nạp một đề từ file vào kho câu hỏi.
 *
 * Năm bước khớp thanh tiến trình trên giao diện admin. Mỗi bước ghi tiến trình
 * ngay để người dùng thấy job đang ở đâu, và để job hỏng giữa chừng không mất
 * phần đã làm được - trích xuất một trang tốn tiền thật.
 */

export interface ImportInput {
  sourceExamId: string;
  jobId: string;
  /** File đã lưu tạm trên đĩa của worker. */
  filePath: string;
  examCode?: string | undefined;
  /** Bỏ qua bước kiểm tra trùng khi admin không cần. */
  skipDedupe?: boolean;
}

async function setStep(
  jobId: string,
  step: "upload" | "extract" | "classify" | "dedupe" | "await_review",
  state: "running" | "done" | "error",
  extra: { error?: string; warnings?: string[] } = {},
): Promise<void> {
  await db
    .update(importJob)
    .set({
      step,
      state,
      ...(extra.error ? { error: extra.error } : {}),
      ...(extra.warnings ? { warnings: extra.warnings } : {}),
      ...(state === "done" && step === "await_review" ? { finishedAt: new Date() } : {}),
    })
    .where(eq(importJob.id, jobId));
}

async function logAiCall(call: AiCall<unknown>, refId: string, userId?: string): Promise<void> {
  await db.insert(aiUsageLog).values({
    feature: call.feature,
    model: call.model,
    ...(call.promptVersion ? { promptVersion: call.promptVersion } : {}),
    inputTokens: call.usage.inputTokens,
    outputTokens: call.usage.outputTokens,
    costVnd: Math.round(call.costVnd),
    ...(userId ? { userId } : {}),
    refId,
  });
}

/** Mã ngắn cho người đọc: Q-00001. Lấy số tiếp theo trong bảng. */
async function nextShortCodes(count: number): Promise<string[]> {
  const result = await db.execute<{ max: number | null }>(
    sql`SELECT max(nullif(regexp_replace(short_code, '\\D', '', 'g'), '')::bigint) AS max FROM question WHERE short_code LIKE 'Q-%'`,
  );
  const start = Number(result.rows[0]?.max ?? 0) + 1;
  return Array.from({ length: count }, (_, i) => `Q-${String(start + i).padStart(5, "0")}`);
}

export async function runImport(input: ImportInput): Promise<{ questionCount: number }> {
  const { jobId, sourceExamId, filePath } = input;
  const warnings: string[] = [];
  const scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), "examlab-import-"));

  const [exam] = await db.select().from(sourceExam).where(eq(sourceExam.id, sourceExamId)).limit(1);
  if (!exam) throw new Error(`Không tìm thấy đề nguồn ${sourceExamId}`);

  try {
    await db.update(importJob).set({ startedAt: new Date() }).where(eq(importJob.id, jobId));
    await setStep(jobId, "extract", "running");

    // --- Bước 1 và 2: render trang rồi trích xuất ---
    const detection = await detectSourceKind(filePath);
    const total = await pageCount(filePath);
    const rendered = await renderPdfPages(filePath, scratchDir, {
      dpi: Number(process.env.IMPORT_DPI ?? 200),
      preprocess: "auto",
      scanned: detection.scanned,
    });
    if (rendered.length !== total) {
      throw new Error(`Render ra ${rendered.length} trang nhưng đề có ${total} trang`);
    }

    const pageResults: { page: number; extraction: PageExtraction }[] = [];
    const orientations: { page: number; rotate: number }[] = [];
    const failedPages: number[] = [];

    for (const page of rendered) {
      // Hướng trang sai không gây lỗi nào mà chỉ lặng lẽ trả về dữ liệu sai.
      const orientation = await aiDetectOrientation(page.imagePath, scratchDir);
      await logAiCall(orientation, jobId);
      orientations.push({ page: page.page, rotate: orientation.result.rotate });

      let imagePath = page.imagePath;
      if (orientation.result.rotate !== 0) {
        imagePath = await rotateImage(
          page.imagePath,
          path.join(scratchDir, "rotated", path.basename(page.imagePath)),
          orientation.result.rotate,
        );
      }

      try {
        const extraction = await aiExtractPage(imagePath, {
          pageNumber: page.page,
          totalPages: rendered.length,
          examCode: input.examCode ?? exam.examCode ?? undefined,
        });
        await logAiCall(extraction, jobId);
        pageResults.push({ page: page.page, extraction: extraction.result });
        if (extraction.retried) warnings.push(`Trang ${page.page}: chạm trần token, đã thử lại`);
      } catch (error) {
        // Một trang hỏng không được làm mất công của các trang đã trả tiền.
        failedPages.push(page.page);
        warnings.push(
          `Trang ${page.page}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Lưu ảnh trang để màn soát đề hiển thị kèm khung câu.
      const key = `source-exams/${sourceExamId}/pages/page-${String(page.page).padStart(3, "0")}.png`;
      await putObject(key, await fs.readFile(imagePath), "image/png");
    }

    if (pageResults.length === 0) throw new Error("Không trích được trang nào");

    const merged = mergePages(pageResults);
    warnings.push(...merged.warnings);

    // --- Bước 3: lưu câu vào kho ở trạng thái nháp ---
    await setStep(jobId, "classify", "running", { warnings });
    const shortCodes = await nextShortCodes(merged.questions.length);
    const inserted: { id: string; stem: string }[] = [];

    for (const [index, item] of merged.questions.entries()) {
      const [row] = await db
        .insert(question)
        .values({
          shortCode: shortCodes[index]!,
          kind: item.kind,
          status: "draft",
          origin: "import",
          // Kế thừa bản quyền từ đề nguồn: đề trường/sở là hạn chế.
          visibility: exam.visibility,
          stem: item.stem,
          sourceExamId,
          sourcePage: item.page,
          sourceIndex: index,
          sourceNumber: item.number,
        })
        .returning({ id: question.id });
      if (!row) continue;
      inserted.push({ id: row.id, stem: item.stem });

      if (item.options.length > 0) {
        await db.insert(questionOption).values(
          item.options.map((option) => ({
            questionId: row.id,
            key: option.key,
            text: option.text,
            isCorrect: item.answerKey.trim().toUpperCase() === option.key,
          })),
        );
      }
      if (item.trueFalseItems.length > 0) {
        await db.insert(questionTrueFalseItem).values(
          item.trueFalseItems.map((tf, tfIndex) => ({
            questionId: row.id,
            key: tf.key,
            text: tf.text,
            // Đáp án dạng "ĐSSĐ": ký tự thứ n ứng với ý thứ n.
            correct: (item.answerKey[tfIndex] ?? "").toUpperCase() === "Đ",
          })),
        );
      }
      if (item.kind === "short_answer" && item.answerKey) {
        await db.insert(questionShortAnswer).values({ questionId: row.id, value: item.answerKey });
      }
      if (item.answerKey) {
        await db.insert(questionAnswerKey).values({
          questionId: row.id,
          value: item.answerKey,
          source: item.answerSource,
        });
      }

      // Cắt hình từ đúng trang chứa nó: câu trải hai trang thì hình có thể ở trang sau.
      for (const [figureIndex, figure] of item.figures.entries()) {
        const source = rendered.find((p) => p.page === figure.page);
        if (!source) continue;
        const localPath = path.join(scratchDir, "figures", `${row.id}-${figureIndex}.png`);
        await cropFigure(source.imagePath, figure, localPath);
        const key = `source-exams/${sourceExamId}/figures/${row.id}-${figureIndex}.png`;
        await putObject(key, await fs.readFile(localPath), "image/png");
        await db.insert(questionFigure).values({
          questionId: row.id,
          storageKey: key,
          caption: figure.caption,
          page: figure.page,
          rectLeft: figure.left,
          rectTop: figure.top,
          rectWidth: figure.width,
          rectHeight: figure.height,
          position: figureIndex,
        });
      }
    }

    // --- Bước 4: nhúng vector và kiểm tra trùng ---
    await setStep(jobId, "dedupe", "running", { warnings });
    if (!input.skipDedupe && inserted.length > 0) {
      const vectors = await embedQuestions(inserted.map((item) => item.stem));
      const newIds = inserted.map((item) => item.id);

      for (const [index, item] of inserted.entries()) {
        const vector = vectors[index];
        if (!vector) continue;
        await db
          .update(question)
          .set({ embedding: vector })
          .where(eq(question.id, item.id));

        // Loại các câu vừa nhập khỏi phép so: một đề có thể có hai câu na ná
        // nhau mà vẫn là hai câu hợp lệ.
        const similar = await findMostSimilar(vector, { excludeQuestionIds: newIds });
        if (!similar || similar.verdict === "unique") continue;

        await db
          .update(question)
          .set({
            similarity: similar.similarity,
            // Chỉ trỏ sang câu gốc khi gần như chắc chắn trùng; mức đáng ngờ chỉ
            // ghi điểm giống để người duyệt tự quyết.
            ...(similar.verdict === "duplicate" ? { duplicateOfId: similar.questionId } : {}),
          })
          .where(eq(question.id, item.id));

        warnings.push(
          `${item.stem.slice(0, 40)}…: giống ${similar.shortCode} ${(similar.similarity * 100).toFixed(1)}%` +
            (similar.verdict === "duplicate" ? " (đã gắn cờ trùng)" : " (cần kiểm tra)"),
        );
      }
    }

    // --- Bước 5: chờ người soát ---
    await db
      .update(importJob)
      .set({ pageOrientations: orientations })
      .where(eq(importJob.id, jobId));
    await setStep(jobId, "await_review", failedPages.length > 0 ? "error" : "done", {
      warnings,
      ...(failedPages.length > 0 ? { error: `Lỗi ở trang ${failedPages.join(", ")}` } : {}),
    });
    await db.update(sourceExam).set({ status: "pending_review" }).where(eq(sourceExam.id, sourceExamId));

    return { questionCount: inserted.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(message);
    const [current] = await db.select().from(importJob).where(eq(importJob.id, jobId)).limit(1);
    await setStep(jobId, current?.step ?? "extract", "error", { error: message, warnings });
    throw error;
  } finally {
    await fs.rm(scratchDir, { recursive: true, force: true });
  }
}
