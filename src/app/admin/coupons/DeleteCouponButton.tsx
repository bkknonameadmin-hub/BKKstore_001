"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteCouponButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const remove = async () => {
    if (!confirm(`"${name}" 쿠폰을 삭제하시겠습니까?\n발급된 쿠폰이 있으면 삭제 대신 비활성화됩니다.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "실패");
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={remove} disabled={loading} className="text-red-500 hover:underline">
      {loading ? "..." : "삭제"}
    </button>
  );
}
