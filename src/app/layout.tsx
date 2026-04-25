import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "낚시몰 - 낚시용품 전문 쇼핑몰",
  description: "낚싯대, 릴, 라인, 루어 등 낚시용품을 합리적인 가격에 만나보세요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
