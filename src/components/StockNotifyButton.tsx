"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "@/store/toast";

type Props = {
  productId: string;
  variantId?: string | null;
  /** 버튼 라벨에 변형 표시 */
  size?: "sm" | "md";
  className?: string;
};

export default function StockNotifyButton({ productId, variantId = null, size = "md", className = "" }: Props) {
  const { data: session, status } = useSession();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // 로그인 시 현재 알림 신청 여부 조회
  useEffect(() => {
    if (status !== "authenticated" || !session?.user) { setHydrated(true); return; }
    fetch("/api/stock-notifications")
      .then((r) => r.ok ? r.json() : [])
      .then((items: { productId: string; variantId: string | null }[]) => {
        const found = items.some((i) => i.productId === productId && (i.variantId || null) === (variantId || null));
        setEnabled(found);
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, [status, session, productId, variantId]);

  const toggle = async () => {
    if (status !== "authenticated") {
      toast.warning("로그인이 필요합니다.", { href: "/login", hrefLabel: "로그인" });
      return;
    }
    setLoading(true);
    try {
      if (enabled) {
        const res = await fetch(`/api/stock-notifications?productId=${productId}${variantId ? `&variantId=${variantId}` : ""}`, { method: "DELETE" });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "취소 실패");
        setEnabled(false);
        toast.info("재입고 알림을 취소했어요.");
      } else {
        const res = await fetch("/api/stock-notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, variantId }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "신청 실패");
        setEnabled(true);
        toast.success("재입고 시 알림을 보내드릴게요!");
      }
    } catch (e: any) {
      toast.error(e.message || "처리 실패");
    } finally {
      setLoading(false);
    }
  };

  const heightCls = size === "sm" ? "h-9 text-xs" : "h-12 text-base";
  const baseCls = enabled
    ? "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
    : "border-gray-300 bg-white text-gray-700 hover:border-brand-500 hover:text-brand-600";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading || !hydrated}
      className={`inline-flex items-center justify-center gap-1.5 px-4 rounded border font-medium transition-colors disabled:opacity-50 ${heightCls} ${baseCls} ${className}`}
    >
      <svg width={size === "sm" ? 14 : 16} height={size === "sm" ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span>{enabled ? "알림 신청 완료" : "재입고 알림 받기"}</span>
    </button>
  );
}
