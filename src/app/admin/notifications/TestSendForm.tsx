"use client";
import { useState } from "react";

const OPTIONS: { key: string; label: string }[] = [
  { key: "ORDER_PAID", label: "주문/결제 완료 (고객)" },
  { key: "SHIPPING_STARTED", label: "배송 시작 (고객)" },
  { key: "DELIVERY_COMPLETED", label: "배송 완료 (고객)" },
  { key: "ORDER_CANCELLED", label: "주문 취소 (고객)" },
  { key: "ORDER_REFUNDED", label: "환불 완료 (고객)" },
  { key: "ADMIN_NEW_ORDER", label: "📥 신규 주문 (관리자)" },
];

export default function TestSendForm() {
  const [phone, setPhone] = useState("");
  const [template, setTemplate] = useState("ORDER_PAID");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null); setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, template }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "발송 실패");
      const provider = data.result?.provider || "?";
      setMsg({
        ok: data.result?.ok,
        text: data.result?.ok
          ? `발송 성공 (${provider}) — ${provider === "console" ? "서버 콘솔을 확인하세요" : "수신 휴대폰을 확인하세요"}`
          : `발송 실패: ${data.result?.error || "알 수 없는 오류"}`,
      });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 max-w-xl">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_120px] gap-2 items-end">
        <div>
          <label className="label">수신 휴대폰</label>
          <input
            type="tel" inputMode="numeric" placeholder="010-0000-0000"
            className="input h-10" value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">템플릿</label>
          <select className="input h-10" value={template} onChange={(e) => setTemplate(e.target.value)}>
            {OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <button type="submit" disabled={loading || !phone} className="btn-primary text-sm h-10">
          {loading ? "발송중..." : "테스트 발송"}
        </button>
      </div>
      {msg && (
        <p className={`text-xs ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</p>
      )}
    </form>
  );
}
