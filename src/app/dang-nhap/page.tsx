"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

/**
 * Màn đăng nhập tối thiểu của Phase 2, chỉ để chứng minh luồng auth chạy được.
 * Giao diện thật dựng ở Phase 4 theo prototype.
 */
export default function DangNhap() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dangKy, setDangKy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangChay, setDangChay] = useState(false);

  async function guiForm(e: React.FormEvent) {
    e.preventDefault();
    setLoi(null);
    setDangChay(true);

    const ketQua = dangKy
      ? await authClient.signUp.email({ email, password, name: email.split("@")[0] ?? email })
      : await authClient.signIn.email({ email, password });

    setDangChay(false);
    if (ketQua.error) {
      setLoi(ketQua.error.message ?? "Không đăng nhập được");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-20">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        {dangKy ? "Đăng ký" : "Đăng nhập"}
      </h1>

      <form onSubmit={guiForm} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="matkhau" className="block text-sm font-medium">
            Mật khẩu
          </label>
          <input
            id="matkhau"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </div>

        {loi && <p className="text-sm text-[var(--color-bad)]">{loi}</p>}

        <button
          type="submit"
          disabled={dangChay}
          className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {dangChay ? "Đang xử lý..." : dangKy ? "Tạo tài khoản" : "Đăng nhập"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setDangKy((v) => !v)}
        className="mt-4 text-sm text-[var(--color-accent)] underline"
      >
        {dangKy ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}
      </button>
    </main>
  );
}
