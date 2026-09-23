import Link from "next/link";
import { getCurrentUser } from "@/server/auth/session";
import { HOME_BY_ROLE } from "@/server/auth/roles";

export default async function TrangChu() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">ExamLab</h1>
      <p className="mt-3 text-[var(--color-ink-2)]">
        Luyện đề và soạn đề Toán THPT theo cấu trúc đề thi tốt nghiệp từ 2025.
      </p>

      {user ? (
        <div className="mt-8 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
          <p className="text-sm text-[var(--color-ink-3)]">Đang đăng nhập</p>
          <p className="mt-1 font-medium">
            {user.name} · {user.email} · vai trò {user.role}
          </p>
          <Link
            href={HOME_BY_ROLE[user.role]}
            className="mt-4 inline-block rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Vào khu vực của tôi
          </Link>
        </div>
      ) : (
        <Link
          href="/dang-nhap"
          className="mt-8 inline-block rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Đăng nhập
        </Link>
      )}
    </main>
  );
}
