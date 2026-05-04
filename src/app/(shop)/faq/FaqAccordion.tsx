"use client";
import { useState } from "react";

type Item = { id: string; question: string; answer: string };

export default function FaqAccordion({ items }: { items: Item[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ul className="bg-white border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
      {items.map((it) => {
        const open = openId === it.id;
        return (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : it.id)}
              aria-expanded={open}
              className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-gray-50"
            >
              <span className="shrink-0 w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold mt-0.5">Q</span>
              <span className="flex-1 text-sm font-medium text-gray-800">{it.question}</span>
              <span className={`shrink-0 text-gray-400 transition-transform mt-0.5 ${open ? "rotate-180" : ""}`}>▾</span>
            </button>
            {open && (
              <div className="px-4 pb-4 pt-0 flex items-start gap-3 animate-fade-in">
                <span className="shrink-0 w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-bold mt-0.5">A</span>
                <p className="flex-1 text-sm text-gray-700 leading-relaxed whitespace-pre-line">{it.answer}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
