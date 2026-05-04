"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/store/toast";
import { formatKRW } from "@/lib/utils";

type Item = {
  id: string;
  name: string;
  variantName: string | null;
  price: number;
  quantity: number;
  refundedQuantity: number;
};

const REASONS = [
  { value: "DEFECT",       label: "상품 불량/하자",          freeReturn: true },
  { value: "WRONG",        label: "오배송",                   freeReturn: true },
  { value: "DAMAGED",      label: "배송 중 파손",             freeReturn: true },
  { value: "CHANGE_MIND",  label: "단순 변심",                freeReturn: false },
  { value: "DIFFERENT",    label: "상품 설명과 다름",         freeReturn: true },
  { value: "ETC",          label: "기타",                     freeReturn: false },
];

export default function ReturnForm({ orderId, items }: { orderId: string; items: Item[] }) {
  const router = useRouter();
  const [type, setType] = useState<"RETURN" | "EXCHANGE">("RETURN");
  const [reason, setReason] = useState("DEFECT");
  const [reasonDetail, setReasonDetail] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const reasonMeta = REASONS.find((r) => r.value === reason)!;

  const refundable = items.filter((it) => it.quantity - it.refundedQuantity > 0);
  const totalSelected = Object.values(selected).reduce((s, q) => s + q, 0);
  const totalAmount = refundable.reduce((sum, it) => {
    const q = selected[it.id] || 0;
    return sum + it.price * q;
  }, 0);

  const setQty = (id: string, q: number) => {
    setSelected((cur) => ({ ...cur, [id]: q }));
  };

  const submit = async () => {
    if (totalSelected === 0) { toast.warning("반품할 상품을 1개 이상 선택해주세요."); return; }

    const reasonText = reasonMeta.label + (reasonDetail.trim() ? `: ${reasonDetail.trim()}` : "");

    setSubmitting(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          type,
          reason: reasonText,
          reasonDetail: reasonDetail.trim() || undefined,
          items: Object.entries(selected)
            .filter(([_, q]) => q > 0)
            .map(([orderItemId, quantity]) => ({ orderItemId, quantity })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "신청 실패");
      toast.success("신청이 접수되었습니다. 검수 후 처리됩니다.");
      router.push("/mypage/orders");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "신청 실패");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 타입 선택 */}
      <section className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-bold text-sm mb-3">신청 종류</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("RETURN")}
            className={`py-3 rounded border-2 text-sm font-medium ${
              type === "RETURN" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 hover:border-gray-300"
            }`}
          >🔙 반품 (환불)</button>
          <button
            type="button"
            onClick={() => setType("EXCHANGE")}
            className={`py-3 rounded border-2 text-sm font-medium ${
              type === "EXCHANGE" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 hover:border-gray-300"
            }`}
          >🔄 교환</button>
        </div>
      </section>

      {/* 상품 선택 */}
      <section className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-bold text-sm mb-3">상품 선택 *</h2>
        <ul className="space-y-2">
          {refundable.map((it) => {
            const remaining = it.quantity - it.refundedQuantity;
            const q = selected[it.id] || 0;
            return (
              <li key={it.id} className="border border-gray-100 rounded p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{it.name}</div>
                  {it.variantName && <div className="text-xs text-gray-500">{it.variantName}</div>}
                  <div className="text-xs text-gray-400">{formatKRW(it.price)} · 환불가능 {remaining}개</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQty(it.id, Math.max(0, q - 1))}
                    className="w-7 h-7 border border-gray-300 rounded text-sm"
                  >−</button>
                  <input
                    type="number" min={0} max={remaining} value={q}
                    onChange={(e) => setQty(it.id, Math.max(0, Math.min(remaining, parseInt(e.target.value || "0", 10) || 0)))}
                    className="w-12 h-7 border border-gray-300 rounded text-center text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setQty(it.id, Math.min(remaining, q + 1))}
                    className="w-7 h-7 border border-gray-300 rounded text-sm"
                  >+</button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 사유 */}
      <section className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-bold text-sm mb-3">사유 *</h2>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="input mb-2">
          {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <textarea
          value={reasonDetail}
          onChange={(e) => setReasonDetail(e.target.value)}
          rows={3} maxLength={1000}
          placeholder="자세한 사유를 적어주세요 (선택)"
          className="input"
        />
        <div className={`mt-2 text-xs px-3 py-2 rounded ${
          reasonMeta.freeReturn ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        }`}>
          {reasonMeta.freeReturn
            ? "🎁 상품 하자/오배송 — 회수 배송비는 판매자가 부담합니다."
            : "💰 단순 변심 — 회수 배송비 5,000원이 환불 금액에서 차감됩니다."}
        </div>
      </section>

      {/* 요약 + 제출 */}
      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">선택 수량</span>
          <span className="font-bold">{totalSelected}개</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">예상 환불액</span>
          <span className="font-bold text-brand-700 text-lg">{formatKRW(totalAmount)}</span>
        </div>
        <p className="text-[11px] text-gray-400">실제 환불 금액은 검수 후 확정됩니다.</p>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.push("/mypage/orders")}
            className="btn-outline flex-1"
          >취소</button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || totalSelected === 0}
            className="btn-primary flex-1"
          >{submitting ? "신청 중..." : "신청하기"}</button>
        </div>
      </section>
    </div>
  );
}
