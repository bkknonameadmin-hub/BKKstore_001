import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "비밀번호 찾기",
  description: "가입 이메일로 비밀번호 재설정 링크를 받으세요.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
