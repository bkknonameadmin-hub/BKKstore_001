"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Props = {
  initialMonth: string;
  initialFrom?: string;
  initialTo?: string;
};

export default function ReportFilters({ initialMonth, initialFrom, initialTo }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [mode, setMode] = useState<"month" | "range">(initialFrom && initialTo ? "range" : "month");
  const [month, setMonth] = useState(initialMonth);
  const [from, setFrom] = useState(initialFrom || "");
  const [to, setTo] = useState(initialTo || "");

  const apply = () => {
    const params = new URLSearchParams(sp.toString());
    if (mode === "month") {
      params.set("month", month);
      params.delete("from");
      params.delete("to");
    } else {
      if (!from || !to) return;
      params.set("from", from);
      params.set("to", to);
      params.delete("month");
    }
    router.push(`/admin/reports?${params.toString()}`);
  };

  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div className="flex border border-gray-300 rounded overflow-hidden text-xs">
        <button
          onClick={() => setMode("month")}
          className={`px-3 py-2 ${mode === "month" ? "bg-brand-500 text-white" : "bg-white text-gray-600"}`}
        >월별</button>
        <button
          onClick={() => setMode("range")}
          className={`px-3 py-2 ${mode === "range" ? "bg-brand-500 text-white" : "bg-white text-gray-600"}`}
        >기간</button>
      </div>

      {mode === "month" ? (
        <input
          type="month" className="input h-9 w-40 text-sm"
          value={month} onChange={(e) => setMonth(e.target.value)}
        />
      ) : (
        <>
          <input type="date" className="input h-9 w-36 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-gray-400 text-xs self-center">~</span>
          <input type="date" className="input h-9 w-36 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </>
      )}

      <button onClick={apply} className="btn-primary h-9 text-sm">조회</button>
    </div>
  );
}
