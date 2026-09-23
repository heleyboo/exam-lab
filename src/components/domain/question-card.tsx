import { MathMarkdown } from "@/components/math-markdown";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { AnswerOption } from "./answer-option";
import {
  COGNITIVE_LEVEL_LABEL,
  CONTENT_STATUS_TONE,
  QUESTION_KIND_LABEL,
  QUESTION_ORIGIN_TONE,
} from "@/lib/tone";

export interface QuestionCardProps {
  shortCode: string;
  kind: keyof typeof QUESTION_KIND_LABEL;
  level?: keyof typeof COGNITIVE_LEVEL_LABEL;
  status: keyof typeof CONTENT_STATUS_TONE;
  origin: keyof typeof QUESTION_ORIGIN_TONE;
  stem: string;
  /** Đường dẫn phân loại, ví dụ "Toán · Lớp 12 · Tích phân". */
  path?: string;
  options?: { key: string; text: string; isCorrect?: boolean }[];
  trueFalseItems?: { key: string; text: string; correct: boolean }[];
  shortAnswer?: string;
  /** Hiện đáp án hay không. Học sinh đang làm bài thì không được thấy. */
  revealAnswer?: boolean;
}

/**
 * Thẻ câu hỏi, dùng lại cho cả bốn loại câu.
 * Phần chip, đề bài và đường dẫn phân loại giống nhau; chỉ khu vực trả lời đổi.
 */
export function QuestionCard({
  shortCode,
  kind,
  level,
  status,
  origin,
  stem,
  path,
  options,
  trueFalseItems,
  shortAnswer,
  revealAnswer = false,
}: QuestionCardProps) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-[var(--color-ink-3)]">{shortCode}</span>
          <Badge tone="accent">{QUESTION_KIND_LABEL[kind]}</Badge>
          {level && <Badge tone="muted">{COGNITIVE_LEVEL_LABEL[level]}</Badge>}
          <StatusBadge status={CONTENT_STATUS_TONE[status]} />
          <StatusBadge status={QUESTION_ORIGIN_TONE[origin]} />
        </div>

        <MathMarkdown source={stem} className="text-[15px]" />

        {kind === "mcq" && options && (
          <div className="space-y-2">
            {options.map((option) => (
              <AnswerOption
                key={option.key}
                optionKey={option.key}
                state={revealAnswer && option.isCorrect ? "correct" : "idle"}
                note={revealAnswer && option.isCorrect ? "Đáp án đúng" : undefined}
              >
                <MathMarkdown source={option.text} />
              </AnswerOption>
            ))}
          </div>
        )}

        {kind === "true_false" && trueFalseItems && (
          <ul className="space-y-2">
            {trueFalseItems.map((item) => (
              <li
                key={item.key}
                className="flex items-start gap-3 rounded-lg border border-[var(--color-line)] px-4 py-2.5"
              >
                <span className="mt-0.5 font-medium">{item.key})</span>
                <span className="flex-1 text-sm">
                  <MathMarkdown source={item.text} />
                </span>
                {revealAnswer && (
                  <Badge tone={item.correct ? "ok" : "bad"}>{item.correct ? "Đúng" : "Sai"}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}

        {kind === "short_answer" && (
          <div className="rounded-lg border border-dashed border-[var(--color-line)] px-4 py-3 text-sm text-[var(--color-ink-3)]">
            {revealAnswer && shortAnswer ? (
              <span className="font-mono text-[var(--color-ink)]">Đáp số: {shortAnswer}</span>
            ) : (
              "Học sinh điền đáp số, tối đa 4 ký tự"
            )}
          </div>
        )}

        {kind === "essay" && (
          <div className="rounded-lg border border-dashed border-[var(--color-line)] px-4 py-3 text-sm text-[var(--color-ink-3)]">
            Học sinh làm ra giấy rồi chụp ảnh, hoặc gõ trên trình soạn công thức
          </div>
        )}

        {path && <p className="text-xs text-[var(--color-ink-3)]">{path}</p>}
      </CardBody>
    </Card>
  );
}
