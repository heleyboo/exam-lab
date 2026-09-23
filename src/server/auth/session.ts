import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./index";
import { HOME_BY_ROLE, isRole, type Role } from "./roles";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
  plan: string;
}

/** Đọc phiên đăng nhập phía server. Trả về null khi chưa đăng nhập. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const user = session.user as typeof session.user & {
    role?: unknown;
    status?: unknown;
    plan?: unknown;
  };

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    // Vai trò lạ hoặc thiếu thì coi như học sinh: quyền thấp nhất, không phải
    // quyền cao nhất.
    role: isRole(user.role) ? user.role : "student",
    status: typeof user.status === "string" ? user.status : "approved",
    plan: typeof user.plan === "string" ? user.plan : "free",
  };
}

export class AccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessDeniedError";
  }
}

/**
 * Chặn truy cập ở phía server.
 *
 * Middleware chỉ chặn được đường dẫn; mọi Server Action, route handler và truy
 * vấn dữ liệu vẫn phải tự kiểm tra. Ẩn menu trên giao diện không phải là phân
 * quyền.
 */
export async function requireRole(allowed: readonly Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AccessDeniedError("Chưa đăng nhập");
  if (!allowed.includes(user.role)) {
    throw new AccessDeniedError(`Vai trò '${user.role}' không có quyền truy cập`);
  }
  return user;
}

/**
 * Dùng cho trang: thiếu quyền thì chuyển hướng thay vì ném lỗi 500.
 * Server Action và route handler vẫn dùng `requireRole` để lỗi nổi lên rõ ràng.
 */
export async function requireRoleOrRedirect(allowed: readonly Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  if (!allowed.includes(user.role)) redirect(HOME_BY_ROLE[user.role]);
  return user;
}
