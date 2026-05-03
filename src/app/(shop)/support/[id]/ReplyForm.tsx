"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 1) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/support/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
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
    <form onSubmit={submit} className="border border-gray-200 rounded p-3 bg-white">
      <textarea
        rows={3} className="input text-sm" maxLength={5000}
        placeholder="추가 답글을 입력해주세요"
        value={content} onChange={(e) => setContent(e.target.value)}
      />
      <div className="mt-2 flex justify-end">
        <button type="submit" disabled={loading || !content.trim()} className="btn-primary text-xs h-9">
          {loading ? "등록 중..." : "답글 등록"}
        </button>
      </div>
    </form>
  );
}
