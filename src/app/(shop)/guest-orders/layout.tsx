import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "비회원 주문조회",
  description: "주문번호와 휴대폰 번호로 비회원 주문을 조회합니다.",
  robots: { index: false, follow: false },
};

export default function GuestOrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
