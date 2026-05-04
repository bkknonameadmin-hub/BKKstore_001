import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "장바구니",
  description: "장바구니에 담긴 상품을 확인하고 주문하세요.",
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
