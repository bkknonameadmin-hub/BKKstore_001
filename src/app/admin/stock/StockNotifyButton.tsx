"use client";
import { useState } from "react";

export default function StockNotifyButton({ count }: { count: number }) {
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (count === 0) { alert("재고 부족 상품이 없습니다."); return; }
    if (!confirm(`재고 부족 ${count}건 알림을 관리자에게 발송합니다.\n(이메일 + Slack)`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stock/check", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "발송 실패");
      const e = data.notified.email.ok ? "✅" : "⚠️";
      const s = data.notified.slack.ok ? "✅" : "⚠️";
      alert(`발송 시도 결과:\n이메일 ${e} ${data.notified.email.error || "OK"}\nSlack ${s} ${data.notified.slack.error || "OK"}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={send} disabled={loading} className="btn-primary text-sm h-9">
      {loading ? "발송 중..." : `📧 알림 발송 (${count}건)`}
    </button>
  );
}
