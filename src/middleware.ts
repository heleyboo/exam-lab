import { NextResponse, type NextRequest } from "next/server";

/**
 * Chặn sớm người chưa đăng nhập ở tầng đường dẫn.
 *
 * Đây KHÔNG phải lớp phân quyền: middleware chỉ nhìn thấy cookie phiên, không
 * đọc được vai trò từ database. Việc kiểm tra vai trò nằm ở `requireRole` phía
 * server, chạy cho từng trang và từng Server Action.
 */
const PROTECTED_PREFIXES = ["/hoc-sinh", "/giao-vien", "/quan-tri", "/duyet"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Tên cookie do Better Auth đặt; kiểm tra sự tồn tại là đủ cho tầng này.
  const hasSession =
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token");

  if (!hasSession) {
    const login = new URL("/dang-nhap", request.url);
    login.searchParams.set("tiep-tuc", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/hoc-sinh/:path*", "/giao-vien/:path*", "/quan-tri/:path*", "/duyet/:path*"],
};
