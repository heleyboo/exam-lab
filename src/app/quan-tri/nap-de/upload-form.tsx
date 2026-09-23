"use client";

import { useActionState } from "react";
import { uploadExam, type UploadState } from "./actions";

const FIELD =
  "mt-1 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm";

export function UploadForm() {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadExam, null);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="file" className="text-sm font-medium">
          File đề (PDF hoặc Word, tối đa 40 MB)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.docx"
          required
          className={FIELD}
        />
        <p className="mt-1 text-xs text-[var(--color-ink-3)]">
          Bản scan vẫn nạp được: hệ thống tự nắn ảnh và tự dò hướng trang.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="examName" className="text-sm font-medium">
            Tên kỳ thi
          </label>
          <input id="examName" name="examName" required className={FIELD} />
        </div>
        <div>
          <label htmlFor="school" className="text-sm font-medium">
            Trường hoặc Sở
          </label>
          <input id="school" name="school" className={FIELD} />
        </div>
        <div>
          <label htmlFor="year" className="text-sm font-medium">
            Năm
          </label>
          <input id="year" name="year" type="number" min={2000} max={2100} className={FIELD} />
        </div>
        <div>
          <label htmlFor="grade" className="text-sm font-medium">
            Lớp
          </label>
          <input id="grade" name="grade" type="number" min={6} max={12} className={FIELD} />
        </div>
        <div>
          <label htmlFor="examCode" className="text-sm font-medium">
            Mã đề
          </label>
          <input id="examCode" name="examCode" placeholder="0101" className={FIELD} />
        </div>
        <div>
          <label htmlFor="visibility" className="text-sm font-medium">
            Phạm vi sử dụng
          </label>
          <select id="visibility" name="visibility" defaultValue="restricted" className={FIELD}>
            <option value="restricted">Hạn chế — đề trường, sở, sách</option>
            <option value="public">Công khai — đề Bộ, đề minh hoạ</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="skipDedupe" className="size-4" />
        Bỏ qua bước kiểm tra trùng
      </label>

      {state && (
        <p
          role="status"
          className={
            state.tone === "ok" ? "text-sm text-[var(--color-ok)]" : "text-sm text-[var(--color-bad)]"
          }
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Đang tải lên..." : "Bắt đầu trích xuất"}
      </button>
    </form>
  );
}
