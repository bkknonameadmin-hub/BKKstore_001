"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABEL, NEXT_TRANSITIONS, COURIERS } from "@/lib/order-status";

type Props = {
  id: string;
  status: OrderStatus;
  courier: string | null;
  trackingNo: string | null;
  adminMemo: string | null;
};

export default function OrderActions({ id, status, courier, trackingNo, adminMemo }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [c, setC] = useState(courier || "CJ대한통운");
  const [t, setT] = useState(trackingNo || "");
  const [memo, setMemo] = useState(adminMemo || "");

  const candidates = NEXT_TRANSITIONS[status];

  const apply = async (next: OrderStatus, body: any = {}) => {
    if (next === "SHIPPED" && !t.trim()) {
      alert("송장번호를 입력해주세요.");
      return;
    }
    if ((next === "CANCELLED" || next === "REFUNDED") && !confirm(`정말 "${ORDER_STATUS_LABEL[next]}" 처리하시겠습니까?`)) return;

    setLoading(next);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "변경 실패");
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(null);
    }
  };

  const saveMemo = async () => {
    setLoading("memo");
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminMemo: memo }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "저장 실패");
      router.refresh();
      alert("저장되었습니다.");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 상태 변경 */}
      <section className="bg-white rounded border border-gray-200 p-5">
        <h2 className="font-bold text-sm pb-3 mb-3 border-b border-gray-100">상태 변경</h2>
        {candidates.length === 0 ? (
          <p className="text-xs text-gray-500">현재 상태에서 변경 가능한 작업이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {candidates.map((next) => {
              if (next === "SHIPPED") {
                return (
                  <div key={next} className="border border-gray-200 rounded p-3 space-y-2">
                    <div className="text-sm font-medium">송장 입력 후 발송 처리</div>
                    <select className="input h-9" value={c} onChange={(e) => setC(e.target.value)}>
                      {COURIERS.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
                    </select>
                    <input className="input h-9" placeholder="송장번호" value={t} onChange={(e) => setT(e.target.value)} />
                    <button
                      onClick={() => apply("SHIPPED", { courier: c, trackingNo: t.trim() })}
                      disabled={loading === "SHIPPED"}
                      className="btn-primary w-full h-10 text-sm"
                    >
                      {loading === "SHIPPED" ? "처리 중..." : "발송 처리"}
                    </button>
                  </div>
                );
              }

              const colorClass =
                next === "CANCELLED" || next === "REFUNDED"
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-brand-500 text-white hover:bg-brand-600";

              return (
                <button
                  key={next}
                  onClick={() => apply(next)}
                  disabled={loading === next}
                  className={`w-full h-10 rounded text-sm font-medium transition-colors disabled:opacity-50 ${colorClass}`}
                >
                  {loading === next ? "처리 중..." : `${ORDER_STATUS_LABEL[next]} 처리`}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 송장 정보 (이미 SHIPPED 이상이면 표시) */}
      {(status === "SHIPPED" || status === "DELIVERED") && (
        <section className="bg-white rounded border border-gray-200 p-5">
          <h2 className="font-bold text-sm pb-3 mb-3 border-b border-gray-100">송장 정보</h2>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-gray-500">택배사</dt><dd>{courier || "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">송장번호</dt><dd className="font-mono text-xs">{trackingNo || "-"}</dd></div>
          </dl>
        </section>
      )}

      {/* 관리자 메모 */}
      <section className="bg-white rounded border border-gray-200 p-5">
        <h2 className="font-bold text-sm pb-3 mb-3 border-b border-gray-100">관리자 메모</h2>
        <textarea
          rows={5}
          className="input text-xs"
          placeholder="내부 처리 메모 (고객에게는 노출되지 않습니다)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
        <button
          onClick={saveMemo}
          disabled={loading === "memo"}
          className="btn-outline w-full h-9 mt-2 text-sm"
        >
          {loading === "memo" ? "저장 중..." : "메모 저장"}
        </button>
      </section>
    </div>
  );
}
