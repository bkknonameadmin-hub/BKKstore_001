"use client";
import { useEffect, useState } from "react";

const TABS = [
  { id: "detail",   label: "상품상세" },
  { id: "qna",      label: "Q&A" },
  { id: "shipping", label: "배송/반품" },
  { id: "reviews",  label: "리뷰" },
];

export default function ProductInfoTabs() {
  const [active, setActive] = useState("detail");

  useEffect(() => {
    const handler = () => {
      const positions = TABS.map((t) => {
        const el = document.getElementById(`section-${t.id}`);
        return { id: t.id, top: el ? el.getBoundingClientRect().top : Infinity };
      });
      // 스티키 헤더(약 100px) 보정
      const visible = positions.filter((p) => p.top < 200).pop();
      if (visible && visible.id !== active) setActive(visible.id);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [active]);

  const jump = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div className="sticky top-[64px] md:top-[120px] z-20 bg-white border-b border-gray-200 -mx-4 px-4 md:mx-0 md:px-0">
      <div className="flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => jump(t.id)}
            className={`flex-1 md:flex-none md:px-8 py-3 text-sm md:text-base font-bold border-b-2 transition-colors ${
              active === t.id
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
