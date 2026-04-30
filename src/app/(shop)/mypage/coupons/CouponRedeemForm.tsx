"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CouponRedeemForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null); setLoading(true);
    try {
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "등록 실패");
      setMsg({ ok: true, text: `"${data.couponName}" 쿠폰이 등록되었습니다.` });
      setCode("");
      router.refresh();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="border border-gray-200 rounded p-4 bg-white">
      <h2 className="text-sm font-bold mb-2">쿠폰 코드 등록</h2>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="WELCOME2026"
          className="input h-10 flex-1 font-mono uppercase"
          maxLength={32}
        />
        <button type="submit" disabled={loading || !code} className="btn-primary text-sm h-10">
          {loading ? "등록 중..." : "등록"}
        </button>
      </div>
      {msg && (
        <p className={`mt-2 text-xs ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</p>
      )}
    </form>
  );
}
