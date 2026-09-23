import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "../db/index";
import * as schema from "../db/schema";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu biến môi trường ${name}. Xem .env.example.`);
  return value;
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: required("BETTER_AUTH_SECRET"),

  emailAndPassword: { enabled: true },

  // Google là tuỳ chọn: thiếu khoá thì vẫn chạy được bằng email/mật khẩu,
  // để người mới clone repo không bị chặn ngay từ bước đăng nhập.
  ...(googleClientId && googleClientSecret
    ? { socialProviders: { google: { clientId: googleClientId, clientSecret: googleClientSecret } } }
    : {}),

  user: {
    additionalFields: {
      /** student | teacher | admin | reviewer. Quyết định quyền truy cập. */
      role: { type: "string", defaultValue: "student", input: false },
      /** Tên trường, dùng cho bảng xếp hạng và hiển thị hồ sơ. */
      school: { type: "string", required: false, input: true },
      /** Lớp, ví dụ "12A3". Chỉ để hiển thị. */
      classLabel: { type: "string", required: false, input: true },
      /** Phạm vi phụ trách của reviewer, ví dụ "Toán 12". Chỉ để hiển thị. */
      scopeLabel: { type: "string", required: false, input: false },
      /** free | pro */
      plan: { type: "string", defaultValue: "free", input: false },
      /** approved | pending. Tài khoản giáo viên phải được admin duyệt. */
      status: { type: "string", defaultValue: "approved", input: false },
    },
  },

  // Phải đứng cuối danh sách plugin để đặt được cookie phiên trong Server Action.
  plugins: [nextCookies()],
});

export type Auth = typeof auth;
