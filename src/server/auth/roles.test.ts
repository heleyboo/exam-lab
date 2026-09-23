import { describe, expect, it } from "vitest";
import { canAccessGroup, HOME_BY_ROLE, isRole, ROLES } from "./roles";

describe("phân quyền theo vai trò", () => {
  it("chỉ chấp nhận bốn vai trò đã định nghĩa", () => {
    expect(isRole("student")).toBe(true);
    expect(isRole("reviewer")).toBe(true);
    expect(isRole("superadmin")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });

  it("mỗi vai trò chỉ vào được khu vực của mình", () => {
    expect(canAccessGroup("student", "student")).toBe(true);
    expect(canAccessGroup("student", "admin")).toBe(false);
    expect(canAccessGroup("student", "teacher")).toBe(false);
    expect(canAccessGroup("teacher", "admin")).toBe(false);
  });

  it("reviewer vào được khu duyệt nội dung nhưng không vào được cài đặt hệ thống", () => {
    // Sửa lỗi của prototype: ở đó reviewer dùng chung toàn bộ menu admin,
    // kể cả quản lý người dùng và cấu hình model AI.
    expect(canAccessGroup("reviewer", "review")).toBe(true);
    expect(canAccessGroup("reviewer", "admin")).toBe(false);
    expect(canAccessGroup("admin", "review")).toBe(true);
  });

  it("vai trò nào cũng có trang mặc định sau khi đăng nhập", () => {
    for (const role of ROLES) {
      expect(HOME_BY_ROLE[role]).toMatch(/^\//);
    }
  });
});
