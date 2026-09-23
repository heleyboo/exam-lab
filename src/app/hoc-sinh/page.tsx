import { requireRoleOrRedirect } from "@/server/auth/session";
import { ROUTE_GROUP_ROLES } from "@/server/auth/roles";

export default async function KhuVucHocSinh() {
  // Kiểm tra ở server, không dựa vào việc ẩn menu trên giao diện.
  const user = await requireRoleOrRedirect(ROUTE_GROUP_ROLES.student);
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Khu vực học sinh
      </h1>
      <p className="mt-2 text-[var(--color-ink-2)]">Xin chào {user.name}.</p>
    </main>
  );
}
