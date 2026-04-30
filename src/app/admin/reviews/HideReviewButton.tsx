"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HideReviewButton({ id, hidden }: { id: string; hidden: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!confirm(hidden ? "이 리뷰를 다시 노출하시겠습니까?" : "이 리뷰를 숨기시겠습니까?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !hidden }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "실패");
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-2 py-1 rounded ${hidden ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
    >
      {loading ? "..." : hidden ? "복원" : "숨김"}
    </button>
  );
}
