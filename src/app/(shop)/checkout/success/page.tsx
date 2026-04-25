"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useCart } from "@/store/cart";

export default function CheckoutSuccessPage() {
  const sp = useSearchParams();
  const orderNo = sp.get("orderNo");
  const clear = useCart((s) => s.clear);

  useEffect(() => { clear(); }, [clear]);

  return (
    <div className="container-mall py-20 max-w-lg text-center">
      <div className="text-5xl mb-4">✅</div>
      <h1 className="text-2xl font-bold">결제가 완료되었습니다</h1>
      <p className="mt-2 text-gray-500">주문번호: <span className="text-gray-800 font-mono">{orderNo}</span></p>
      <p className="mt-1 text-sm text-gray-500">주문 내역은 마이페이지에서 확인하실 수 있습니다.</p>
      <div className="mt-8 flex justify-center gap-2">
        <Link href="/" className="btn-outline">홈으로</Link>
        <Link href="/mypage" className="btn-primary">주문 확인</Link>
      </div>
    </div>
  );
}
