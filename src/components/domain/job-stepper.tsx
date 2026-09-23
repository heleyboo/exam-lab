import { cn } from "@/lib/cn";

export type StepState = "done" | "current" | "error" | "todo";

const DOT_CLASS: Record<StepState, string> = {
  done: "bg-[var(--color-ok)] text-white border-[var(--color-ok)]",
  current: "bg-[var(--color-accent)] text-white border-[var(--color-accent)]",
  error: "bg-[var(--color-bad)] text-white border-[var(--color-bad)]",
  todo: "bg-[var(--color-surface)] text-[var(--color-ink-3)] border-[var(--color-line)]",
};

/** Thanh tiến trình năm bước của job nạp đề. */
export function JobStepper({
  steps,
  className,
}: {
  steps: { label: string; state: StepState }[];
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-y-3", className)}>
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-[11px] font-medium",
                DOT_CLASS[step.state],
              )}
              aria-hidden
            >
              {step.state === "done" ? "✓" : step.state === "error" ? "!" : index + 1}
            </span>
            <span
              className={cn(
                "text-xs",
                step.state === "todo" ? "text-[var(--color-ink-3)]" : "text-[var(--color-ink)]",
              )}
            >
              {step.label}
              <span className="sr-only">
                {step.state === "done"
                  ? " — đã xong"
                  : step.state === "current"
                    ? " — đang chạy"
                    : step.state === "error"
                      ? " — lỗi"
                      : " — chưa chạy"}
              </span>
            </span>
          </div>
          {index < steps.length - 1 && (
            <span className="mx-3 h-px w-8 bg-[var(--color-line)]" aria-hidden />
          )}
        </li>
      ))}
    </ol>
  );
}
