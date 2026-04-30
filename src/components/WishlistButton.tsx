"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WishlistButton({
  productId,
  initialActive,
  signedIn,
}: {
  productId: string;
  initialActive: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!signedIn) {
      if (confirm("로그인 후 위시리스트에 담을 수 있습니다. 로그인 페이지로 이동할까요?")) {
        router.push("/login?callbackUrl=" + encodeURIComponent(window.location.pathname));
      }
      return;
    }
    setLoading(true);
    try {
      if (active) {
        const res = await fetch(`/api/wishlist?productId=${productId}`, { method: "DELETE" });
        if (!res.ok) throw new Error((await res.json()).error || "실패");
        setActive(false);
      } else {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "실패");
        setActive(true);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      title={active ? "위시리스트에서 제거" : "위시리스트에 추가"}
      className={`w-10 h-10 rounded-full border flex items-center justify-center text-xl transition-colors ${
        active ? "border-red-300 bg-red-50 text-red-500" : "border-gray-300 text-gray-400 hover:border-red-300 hover:text-red-400"
      }`}
    >
      {active ? "❤" : "♡"}
    </button>
  );
}
