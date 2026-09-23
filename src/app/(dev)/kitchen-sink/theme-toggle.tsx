"use client";

import { useEffect, useState } from "react";

/** Đổi nền sáng tối để soi component ở cả hai chế độ. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((value) => !value)}
      className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
    >
      {dark ? "Chuyển nền sáng" : "Chuyển nền tối"}
    </button>
  );
}
