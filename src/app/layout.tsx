import type { Metadata } from "next";
import { Be_Vietnam_Pro, Montserrat } from "next/font/google";
import "./globals.css";

// Bắt buộc có subset "vietnamese", nếu không dấu tiếng Việt sẽ phải tải font
// dự phòng và hiển thị lệch.
const beVietnamPro = Be_Vietnam_Pro({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["vietnamese", "latin"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

const montserrat = Montserrat({
  weight: ["500", "600", "700"],
  subsets: ["vietnamese", "latin"],
  display: "swap",
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "ExamLab",
  description: "Luyện đề và soạn đề Toán THPT",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
