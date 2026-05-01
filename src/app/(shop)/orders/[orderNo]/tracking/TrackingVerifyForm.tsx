"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TrackingVerifyForm({ orderNo }: { orderNo: string }) {
  const router = useRouter();
  const [last4, setLast4] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (last4.length !== 4) return;
    router.push(`/orders/${orderNo}/tracking?last4=${last4}`);
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="text"
        inputMode="numeric"
        maxLength={4}
        placeholder="휴대폰 뒤 4자리"
        className="input h-10 flex-1 font-mono tracking-widest text-center"
        value={last4}
        onChange={(e) => setLast4(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
      />
      <button type="submit" disabled={last4.length !== 4} className="btn-primary text-sm h-10 px-4">
        확인
      </button>
    </form>
  );
}
