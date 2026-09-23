/**
 * Bốn vai trò của nền tảng.
 * Phân quyền chỉ dựa trên vai trò; `scopeLabel` (trường/lớp/môn) chỉ để hiển thị,
 * không dùng để lọc dữ liệu - đã chốt ở Validation Session 1.
 */
export const ROLES = ["student", "teacher", "admin", "reviewer"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/**
 * Vai trò nào vào được nhóm route nào.
 * Reviewer chỉ được các màn duyệt nội dung, không có cài đặt hệ thống - sửa lỗi
 * của prototype vốn cho reviewer dùng chung toàn bộ menu admin.
 */
export const ROUTE_GROUP_ROLES = {
  student: ["student"],
  teacher: ["teacher"],
  admin: ["admin"],
  review: ["admin", "reviewer"],
} as const satisfies Record<string, readonly Role[]>;

export type RouteGroup = keyof typeof ROUTE_GROUP_ROLES;

export function canAccessGroup(role: Role, group: RouteGroup): boolean {
  return (ROUTE_GROUP_ROLES[group] as readonly Role[]).includes(role);
}

/** Trang mặc định của từng vai trò sau khi đăng nhập. */
export const HOME_BY_ROLE: Record<Role, string> = {
  student: "/hoc-sinh",
  teacher: "/giao-vien",
  admin: "/quan-tri",
  reviewer: "/duyet",
};
