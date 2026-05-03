"use client";
import Link from "next/link";
import { useToast } from "@/store/toast";

const KIND_STYLES: Record<string, string> = {
  info:    "bg-gray-900 text-white",
  success: "bg-emerald-600 text-white",
  error:   "bg-rose-600 text-white",
  warning: "bg-amber-500 text-white",
};

const ICON: Record<string, string> = {
  info: "ℹ", success: "✓", error: "✕", warning: "!",
};

export default function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const remove = useToast((s) => s.remove);

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto min-w-[260px] max-w-[90vw] px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm animate-slide-up ${KIND_STYLES[t.kind]}`}
        >
          <span className="w-5 h-5 inline-flex items-center justify-center rounded-full bg-white/20 text-xs font-bold">
            {ICON[t.kind]}
          </span>
          <span className="flex-1">{t.message}</span>
          {t.href && (
            <Link
              href={t.href}
              onClick={() => remove(t.id)}
              className="text-xs font-bold underline underline-offset-2 hover:no-underline"
            >
              {t.hrefLabel || "이동"}
            </Link>
          )}
          <button
            onClick={() => remove(t.id)}
            className="text-white/70 hover:text-white text-base leading-none ml-1"
            aria-label="닫기"
          >×</button>
        </div>
      ))}
    </div>
  );
}
