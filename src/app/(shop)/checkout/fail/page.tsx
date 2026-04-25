"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function CheckoutFailPage() {
  const sp = useSearchParams();
  const reason = sp.get("reason");

  return (
    <div className="container-mall py-20 max-w-lg text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold">결제에 실패했습니다</h1>
      {reason && <p className="mt-2 text-gray-500 text-sm">사유: {reason}</p>}
      <div className="mt-8 flex justify-center gap-2">
        <Link href="/cart" className="btn-outline">장바구니로</Link>
        <Link href="/checkout" className="btn-primary">다시 시도</Link>
      </div>
    </div>
  );
}
