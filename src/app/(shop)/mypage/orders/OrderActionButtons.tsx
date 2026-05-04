"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "@/store/toast";

type Status = "PENDING" | "PAID" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED";

type Props = {
  orderId: string;
  orderNo: string;
  status: Status;
  hasTracking: boolean;
  reviewable: boolean;
};

export default function OrderActionButtons({ orderId, orderNo, status, hasTracking, reviewable }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // 주문 취소 가능: PENDING(결제대기) 또는 PAID(결제완료, 출고 전)
  const canCancel = status === "PENDING" || status === "PAID";
  // 반품/교환 신청 가능: DELIVERED 만
  const canReturn = status === "DELIVERED";

  const cancel = async () => {
    if (!confirm("주문을 취소하시겠습니까?\n결제 후 취소 시 환불은 영업일 기준 3~5일 소요됩니다.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "취소 실패");
      toast.success(data.message || "주문이 취소되었습니다.");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "취소 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {hasTracking && (
        <Link
          href={`/orders/${orderNo}/tracking`}
          className="text-xs px-2 py-1 rounded border border-brand-300 text-brand-700 hover:bg-brand-50"
        >배송조회</Link>
      )}
      {reviewable && (
        <Link
          href="/mypage/reviews"
          className="text-xs px-2 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-50"
        >리뷰 작성</Link>
      )}
      {canReturn && (
        <Link
          href={`/mypage/orders/${orderId}/return`}
          className="text-xs px-2 py-1 rounded border border-rose-300 text-rose-700 hover:bg-rose-50"
        >반품/교환</Link>
      )}
      {canCancel && (
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
        >
          {busy ? "취소 중..." : "주문 취소"}
        </button>
      )}
    </div>
  );
}
