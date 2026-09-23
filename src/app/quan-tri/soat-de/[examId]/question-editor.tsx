"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { QUESTION_KIND_LABEL } from "@/lib/tone";
import { saveQuestion, submitReview, markDuplicate } from "./actions";

export interface EditorQuestion {
  id: string;
  shortCode: string;
  kind: keyof typeof QUESTION_KIND_LABEL;
  stem: string;
  answerKey: string;
  sourcePage: number | null;
  sourceNumber: string | null;
  status: string;
  options: { key: string; text: string; isCorrect: boolean }[];
  trueFalseItems: { key: string; text: string; correct: boolean }[];
  figureUrls: string[];
  duplicate: { shortCode: string; similarity: number; flagged: boolean } | null;
  reviewed: boolean;
}

const EDIT_KINDS = [
  { value: "boundary", label: "Ranh giới câu" },
  { value: "latex", label: "Công thức" },
  { value: "options", label: "Phương án" },
  { value: "answer", label: "Đáp án" },
  { value: "figure", label: "Hình" },
  { value: "taxonomy", label: "Phân loại" },
] as const;

/**
 * Sửa và duyệt một câu.
 *
 * Người duyệt chọn "duyệt thẳng" hay "sửa rồi duyệt", và nếu có sửa thì đánh
 * dấu sửa ở khâu nào. Đó chính là số liệu đo chất lượng trích xuất, thu ngay
 * trong lúc làm việc bình thường thay vì phải chấm riêng một lượt.
 */
export function QuestionEditor({
  question,
  onFocus,
}: {
  question: EditorQuestion;
  onFocus: (id: string) => void;
}) {
  const [stem, setStem] = useState(question.stem);
  const [answerKey, setAnswerKey] = useState(question.answerKey);
  const [edited, setEdited] = useState(false);
  const openedAt = useRef(Date.now());

  useEffect(() => {
    openedAt.current = Date.now();
  }, [question.id]);

  const dirty = stem !== question.stem || answerKey !== question.answerKey;

  return (
    <article
      id={`cau-${question.id}`}
      onFocusCapture={() => onFocus(question.id)}
      className="scroll-mt-4 rounded-[13px] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-[var(--color-ink-3)]">{question.shortCode}</span>
        <Badge tone="accent">{QUESTION_KIND_LABEL[question.kind]}</Badge>
        {question.sourceNumber && <Badge tone="muted">Câu {question.sourceNumber}</Badge>}
        {question.sourcePage && <Badge tone="muted">Trang {question.sourcePage}</Badge>}
        {question.reviewed && <Badge tone="ok">Đã soát</Badge>}
      </div>

      {question.duplicate && (
        <div className="mt-3 rounded-lg border border-[var(--color-bad)] bg-[var(--color-bad-soft)] p-3 text-sm">
          <p>
            Giống <strong>{question.duplicate.shortCode}</strong>{" "}
            {(question.duplicate.similarity * 100).toFixed(1)}%
            {question.duplicate.flagged ? " — đã gắn cờ trùng" : " — cần kiểm tra"}
          </p>
          <div className="mt-2 flex gap-2">
            <form action={markDuplicate}>
              <input type="hidden" name="questionId" value={question.id} />
              <input type="hidden" name="isDuplicate" value="true" />
              <button className="rounded-md border border-[var(--color-line)] px-2 py-1 text-xs">
                Đánh dấu là bản trùng
              </button>
            </form>
            <form action={markDuplicate}>
              <input type="hidden" name="questionId" value={question.id} />
              <input type="hidden" name="isDuplicate" value="false" />
              <button className="rounded-md border border-[var(--color-line)] px-2 py-1 text-xs">
                Vẫn giữ, khác dữ kiện
              </button>
            </form>
          </div>
        </div>
      )}

      <form action={saveQuestion} className="mt-3 space-y-3">
        <input type="hidden" name="questionId" value={question.id} />

        <div>
          <label htmlFor={`stem-${question.id}`} className="eyebrow">
            Đề bài (Markdown kèm LaTeX)
          </label>
          <textarea
            id={`stem-${question.id}`}
            name="stem"
            rows={5}
            value={stem}
            onChange={(event) => {
              setStem(event.target.value);
              setEdited(true);
            }}
            className="mt-1 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 font-mono text-[13px]"
          />
        </div>

        {question.options.length > 0 && (
          <ul className="space-y-1 text-sm">
            {question.options.map((option) => (
              <li key={option.key} className="flex gap-2">
                <span className="font-medium">{option.key}.</span>
                <span className="flex-1 font-mono text-xs">{option.text}</span>
                {option.isCorrect && <Badge tone="ok">Đáp án</Badge>}
              </li>
            ))}
          </ul>
        )}

        {question.trueFalseItems.length > 0 && (
          <ul className="space-y-1 text-sm">
            {question.trueFalseItems.map((item) => (
              <li key={item.key} className="flex gap-2">
                <span className="font-medium">{item.key})</span>
                <span className="flex-1 font-mono text-xs">{item.text}</span>
                <Badge tone={item.correct ? "ok" : "bad"}>{item.correct ? "Đúng" : "Sai"}</Badge>
              </li>
            ))}
          </ul>
        )}

        {question.figureUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {question.figureUrls.map((url, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={`Hình ${index + 1} của câu ${question.shortCode}`}
                className="h-24 rounded border border-[var(--color-line)] bg-white object-contain"
              />
            ))}
          </div>
        )}

        <div className="flex items-end gap-3">
          <div className="w-40">
            <label htmlFor={`answer-${question.id}`} className="eyebrow">
              Đáp án
            </label>
            <input
              id={`answer-${question.id}`}
              name="answerKey"
              value={answerKey}
              placeholder={question.kind === "true_false" ? "ĐSSĐ" : "B"}
              onChange={(event) => {
                setAnswerKey(event.target.value);
                setEdited(true);
              }}
              className="mt-1 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={!dirty}
            className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm disabled:opacity-50"
          >
            Lưu sửa
          </button>
        </div>
      </form>

      <form action={submitReview} className="mt-4 space-y-2 border-t border-[var(--color-line)] pt-3">
        <input type="hidden" name="questionId" value={question.id} />
        <input type="hidden" name="durationMs" value={Date.now() - openedAt.current} />

        {edited && (
          <fieldset>
            <legend className="eyebrow">Phải sửa ở khâu nào</legend>
            <div className="mt-1 flex flex-wrap gap-3">
              {EDIT_KINDS.map((kind) => (
                <label key={kind.value} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="edits" value={kind.value} className="size-4" />
                  {kind.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            name="outcome"
            value={edited ? "approved_edited" : "approved_clean"}
            className="rounded-lg bg-[var(--color-ok)] px-3 py-2 text-sm font-medium text-white"
          >
            {edited ? "Sửa rồi duyệt" : "Duyệt thẳng"}
          </button>
          <button
            type="submit"
            name="outcome"
            value="rejected"
            className="rounded-lg border border-[var(--color-bad)] px-3 py-2 text-sm text-[var(--color-bad)]"
          >
            Từ chối
          </button>
        </div>
      </form>
    </article>
  );
}
