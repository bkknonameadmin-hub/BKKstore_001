"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feeds/naver/invalidate", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "실패");
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={refresh} disabled={loading} className="btn-outline text-xs h-10 px-3" title="캐시 즉시 갱신">
      {loading ? "갱신 중..." : "🔄 캐시 갱신"}
    </button>
  );
}
