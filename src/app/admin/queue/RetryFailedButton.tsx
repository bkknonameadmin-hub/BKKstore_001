"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RetryFailedButton({ jobIds }: { jobIds: string[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const retryAll = async () => {
    if (!confirm(`${jobIds.length}건의 실패 작업을 모두 재시도하시겠습니까?`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/queue/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "실패");
      alert(`${data.retried}건 재시도 큐에 추가됨`);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={retryAll} disabled={loading} className="btn-primary text-xs h-9">
      {loading ? "처리 중..." : `🔄 전체 재시도 (${jobIds.length})`}
    </button>
  );
}
