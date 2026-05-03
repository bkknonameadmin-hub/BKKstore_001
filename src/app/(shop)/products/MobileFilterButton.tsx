"use client";
import { useEffect, useState } from "react";

type Props = {
  /** 활성 필터 갯수 (배지 표시용) */
  count: number;
  /** 사이드바 콘텐츠 (서버 컴포넌트로 미리 렌더된 children) */
  children: React.ReactNode;
};

export default function MobileFilterButton({ count, children }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex items-center gap-1.5 h-9 px-3 border border-gray-300 rounded-full text-sm bg-white hover:border-brand-500"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <line x1="10" y1="18" x2="14" y2="18" />
        </svg>
        <span>필터</span>
        {count > 0 && (
          <span className="bg-brand-500 text-white text-[11px] font-bold px-1.5 rounded-full leading-tight">{count}</span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 max-h-[85vh] bg-white rounded-t-2xl shadow-2xl flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-bold text-base">필터 {count > 0 && <span className="text-brand-500">({count})</span>}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="w-9 h-9 flex items-center justify-center text-2xl text-gray-500 hover:text-gray-800"
              >×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {children}
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-primary w-full h-12 text-base"
              >결과 보기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
