import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "고객지원 / 1:1 문의",
  description: "주문, 배송, 환불 등 1:1 문의를 남겨주시면 신속히 답변드립니다.",
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
