"use client";
import { useEffect, useState } from "react";

type Props = {
  thumbnail?: string | null;
  images: string[];
  alt: string;
};

export default function ImageGallery({ thumbnail, images, alt }: Props) {
  // 메인 + 추가 이미지 합쳐 dedupe
  const all = Array.from(new Set([thumbnail, ...images].filter(Boolean) as string[]));
  const list = all.length > 0 ? all : ["/images/placeholder.svg"];
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % list.length);
      if (e.key === "ArrowLeft")  setActive((i) => (i - 1 + list.length) % list.length);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoomed, list.length]);

  return (
    <>
      <div>
        {/* 메인 이미지 */}
        <div
          className="relative aspect-square bg-gray-100 rounded-lg border border-gray-200 overflow-hidden cursor-zoom-in"
          onClick={() => setZoomed(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={list[active]} alt={alt} className="w-full h-full object-cover" />
          {list.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActive((i) => (i - 1 + list.length) % list.length); }}
                aria-label="이전 이미지"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow flex items-center justify-center text-lg"
              >‹</button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActive((i) => (i + 1) % list.length); }}
                aria-label="다음 이미지"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow flex items-center justify-center text-lg"
              >›</button>
              <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded font-mono tabular-nums">
                {active + 1} / {list.length}
              </div>
            </>
          )}
        </div>

        {/* 썸네일 그리드 */}
        {list.length > 1 && (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {list.slice(0, 10).map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className={`aspect-square bg-gray-100 rounded border-2 overflow-hidden transition-colors ${
                  i === active ? "border-brand-500" : "border-gray-200 hover:border-gray-400"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 줌 라이트박스 */}
      {zoomed && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center animate-fade-in"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="닫기"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white text-2xl hover:bg-white/20 flex items-center justify-center"
          >×</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={list[active]}
            alt={alt}
            className="max-w-[92vw] max-h-[88vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {list.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActive((i) => (i - 1 + list.length) % list.length); }}
                aria-label="이전"
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center"
              >‹</button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActive((i) => (i + 1) % list.length); }}
                aria-label="다음"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center"
              >›</button>
            </>
          )}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm font-mono tabular-nums">
            {active + 1} / {list.length}
          </div>
        </div>
      )}
    </>
  );
}
