"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminReplyForm({ ticketId, currentStatus }: { ticketId: string; currentStatus: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim() || undefined,
          status: status !== currentStatus ? status : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "실패");
      setContent("");
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded border border-gray-200 p-5 space-y-3">
      <h2 className="font-bold text-sm">답변 작성</h2>
      <textarea
        rows={5} className="input text-sm" maxLength={5000}
        placeholder="고객에게 보낼 답변 내용을 입력하세요"
        value={content} onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex items-center justify-between gap-2">
        <select className="input h-10 text-sm w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="OPEN">신규</option>
          <option value="PENDING">확인중</option>
          <option value="ANSWERED">답변완료</option>
          <option value="CLOSED">종료</option>
        </select>
        <button type="submit" disabled={loading} className="btn-primary text-sm h-10">
          {loading ? "처리 중..." : "답변 + 상태 저장"}
        </button>
      </div>
    </form>
  );
}
