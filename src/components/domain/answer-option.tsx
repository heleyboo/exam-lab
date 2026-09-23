import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * Ô phương án trả lời.
 *
 * Prototype áp style bằng thuộc tính `data-choice` rồi quét DOM để tô màu.
 * Ở đây là variant khai báo, React tự lo phần còn lại.
 */
const answerOption = cva(
  "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors min-h-11",
  {
    variants: {
      state: {
        /** Chưa chọn. */
        idle: "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]",
        /** Học sinh đã chọn, chưa chấm. */
        selected: "border-[var(--color-accent)] bg-[var(--color-accent-soft)]",
        /** Đáp án đúng, hiện sau khi chấm. */
        correct: "border-[var(--color-ok)] bg-[var(--color-ok-soft)]",
        /** Học sinh chọn sai. */
        wrong: "border-[var(--color-bad)] bg-[var(--color-bad-soft)]",
        /** Phương án không được chọn, làm mờ sau khi chấm. */
        muted: "border-[var(--color-line)] bg-[var(--color-surface)] opacity-60",
      },
    },
    defaultVariants: { state: "idle" },
  },
);

export interface AnswerOptionProps extends VariantProps<typeof answerOption> {
  optionKey: string;
  /** Nhãn phụ như "Đáp án đúng" hoặc "Em chọn". */
  note?: string;
  children: React.ReactNode;
  className?: string;
}

export function AnswerOption({ optionKey, note, state, children, className }: AnswerOptionProps) {
  return (
    <div className={cn(answerOption({ state }), className)}>
      <span className="mt-0.5 font-[family-name:var(--font-display)] text-sm font-semibold">
        {optionKey}.
      </span>
      <span className="flex-1 text-sm">{children}</span>
      {note && <span className="eyebrow shrink-0">{note}</span>}
    </div>
  );
}
