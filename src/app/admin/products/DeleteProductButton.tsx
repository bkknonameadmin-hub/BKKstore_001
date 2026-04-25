"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!confirm(`"${name}" 상품을 삭제하시겠습니까?\n주문 이력이 있는 상품은 삭제할 수 없으며 미판매로 전환됩니다.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "삭제 실패");
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handle} disabled={loading} className="text-red-500 hover:underline">
      {loading ? "처리중..." : "삭제"}
    </button>
  );
}
