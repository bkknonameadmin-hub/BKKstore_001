"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [hint, setHint] = useState<string | null>(null);

  // 힌트 자동 사라짐
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 2500);
    return () => clearTimeout(t);
  }, [hint]);

  const toggle = async () => {
    if (!signedIn) {
      setHint("로그인 후 이용할 수 있습니다.");
      // 1초 후 부드럽게 로그인 페이지로 이동
      setTimeout(() => {
        router.push("/login?callbackUrl=" + encodeURIComponent(window.location.pathname));
      }, 1200);
      return;
    }
    setLoading(true);
    try {
      if (active) {
        const res = await fetch(`/api/wishlist?productId=${productId}`, { method: "DELETE" });
        if (!res.ok) throw new Error((await res.json()).error || "실패");
        setActive(false);
        setHint("위시리스트에서 제거했어요.");
      } else {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "실패");
        setActive(true);
        setHint("위시리스트에 추가했어요!");
      }
    } catch (e: any) {
      setHint(e.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        title={active ? "위시리스트에서 제거" : "위시리스트에 추가"}
        aria-pressed={active}
        className={`w-10 h-10 rounded-full border flex items-center justify-center text-xl transition-all ${
          active
            ? "border-red-300 bg-red-50 text-red-500 hover:scale-105"
            : "border-gray-300 text-gray-400 hover:border-red-300 hover:text-red-400 hover:scale-105"
        } ${loading ? "opacity-60" : ""}`}
      >
        {active ? "❤" : "♡"}
      </button>

      {hint && (
        <div className="absolute right-0 top-12 z-10 whitespace-nowrap bg-gray-900 text-white text-xs px-3 py-1.5 rounded shadow-lg animate-fade-in">
          {hint}
        </div>
      )}
    </div>
  );
}
