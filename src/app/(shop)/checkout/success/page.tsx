"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useCart } from "@/store/cart";
import { trackPurchase } from "@/lib/analytics";

export default function CheckoutSuccessPage() {
  const sp = useSearchParams();
  const orderNo = sp.get("orderNo");
  const items = useCart((s) => s.items);
  const totalPrice = useCart((s) => s.totalPrice);
  const clear = useCart((s) => s.clear);
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    // GA4 purchase 이벤트 — 카트가 비어있지 않다면 트래킹
    if (orderNo && items.length > 0) {
      trackPurchase({
        transaction_id: orderNo,
        value: totalPrice(),
        items: items.map((i) => ({
          item_id: i.productId,
          item_name: i.name,
          item_variant: i.variantName || undefined,
          price: i.price,
          quantity: i.quantity,
        })),
      });
    }

    // 트래킹 후 카트 비우기
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
