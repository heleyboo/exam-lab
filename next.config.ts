import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Worker và app dùng chung mã trong src/server, nhưng các gói nặng dưới đây
  // chỉ chạy phía server, không được gói vào bundle trình duyệt.
  serverExternalPackages: ["pg", "pg-boss"],
};

export default nextConfig;
