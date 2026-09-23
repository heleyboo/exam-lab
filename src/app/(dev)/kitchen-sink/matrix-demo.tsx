"use client";

import { useState } from "react";
import { MatrixCell } from "@/components/domain/matrix-cell";
import { NumericKeypad } from "@/components/domain/numeric-keypad";

export function MatrixDemo() {
  const [count, setCount] = useState(2);
  const [answer, setAnswer] = useState("");

  return (
    <div className="flex flex-wrap items-start gap-8">
      <div className="space-y-2">
        <p className="eyebrow">Ô ma trận</p>
        <MatrixCell
          value={count}
          onChange={setCount}
          pointsPerQuestion={0.25}
          topicLabel="Tích phân"
          levelLabel="Thông hiểu"
          kindLabel="Nhiều lựa chọn"
        />
        <MatrixCell
          value={9}
          onChange={() => {}}
          pointsPerQuestion={1}
          topicLabel="Cực trị"
          levelLabel="Vận dụng cao"
          kindLabel="Đúng/Sai"
          warning
        />
      </div>
      <div className="space-y-2">
        <p className="eyebrow">Bàn phím đáp số</p>
        <p className="font-mono text-lg tabular-nums">{answer || "—"}</p>
        <NumericKeypad value={answer} onChange={setAnswer} />
      </div>
    </div>
  );
}
