"use client";

import { useState } from "react";
import { BBoxOverlay, type BBox } from "@/components/domain/bbox-overlay";
import { QuestionEditor, type EditorQuestion } from "./question-editor";

export interface PageView {
  page: number;
  imageUrl: string;
  boxes: BBox[];
}

/**
 * Không gian soát đề: ảnh trang gốc bên trái, câu đã tách bên phải.
 *
 * Bấm khung trên ảnh thì cuộn tới câu tương ứng, và ngược lại khi con trỏ vào
 * một câu thì trang chứa nó hiện lên. Không có liên kết hai chiều này thì người
 * soát phải tự dò xem câu nào ứng với chỗ nào trên đề.
 */
export function ProofingWorkspace({
  pages,
  questions,
}: {
  pages: PageView[];
  questions: EditorQuestion[];
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(questions[0]?.id ?? null);

  const current = pages[pageIndex];

  function focusQuestion(id: string) {
    setActiveId(id);
    const target = questions.find((q) => q.id === id);
    const index = pages.findIndex((p) => p.page === target?.sourcePage);
    if (index >= 0) setPageIndex(index);
  }

  return (
    <div className="@container">
      <div className="grid gap-6 @[900px]:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-3 @[900px]:sticky @[900px]:top-4 @[900px]:self-start">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">Đề gốc</p>
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                disabled={pageIndex === 0}
                className="rounded-md border border-[var(--color-line)] px-2 py-1 disabled:opacity-40"
              >
                ←
              </button>
              <span className="tabular-nums">
                Trang {current?.page ?? "-"}/{pages.length}
              </span>
              <button
                type="button"
                onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
                disabled={pageIndex >= pages.length - 1}
                className="rounded-md border border-[var(--color-line)] px-2 py-1 disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>

          {current ? (
            <BBoxOverlay
              pageImageUrl={current.imageUrl}
              pageLabel={`Trang ${current.page} của đề`}
              boxes={current.boxes.map((box) => ({
                ...box,
                state: box.id === activeId ? "selected" : box.state,
              }))}
              onSelect={(id) => {
                setActiveId(id);
                document.getElementById(`cau-${id}`)?.scrollIntoView({ block: "center" });
              }}
            />
          ) : (
            <p className="text-sm text-[var(--color-ink-3)]">Không có ảnh trang</p>
          )}
        </div>

        <div className="space-y-4">
          {questions.map((question) => (
            <QuestionEditor key={question.id} question={question} onFocus={focusQuestion} />
          ))}
        </div>
      </div>
    </div>
  );
}
