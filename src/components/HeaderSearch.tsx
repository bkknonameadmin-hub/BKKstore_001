"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatKRW } from "@/lib/utils";

type Suggest = {
  products: { id: string; name: string; brand: string | null; thumbnail: string | null; price: number; salePrice: number | null }[];
  brands: string[];
  categories: { id: string; name: string; slug: string }[];
};

const RECENT_KEY = "fishing-mall-recent-search";
const MAX_RECENT = 8;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function writeRecent(arr: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, MAX_RECENT))); } catch {}
}
function pushRecent(q: string) {
  if (!q.trim()) return;
  const arr = readRecent().filter((r) => r !== q);
  arr.unshift(q);
  writeRecent(arr);
}

export default function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [suggest, setSuggest] = useState<Suggest>({ products: [], brands: [], categories: [] });
  const [recent, setRecent] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => { setRecent(readRecent()); }, []);

  // 디바운스 자동완성
  useEffect(() => {
    if (!q.trim()) { setSuggest({ products: [], brands: [], categories: [] }); return; }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal });
        if (r.ok) setSuggest(await r.json());
      } catch {}
    }, 200);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = q.trim();
    if (!text) return;
    pushRecent(text);
    setOpen(false);
    router.push(`/products?q=${encodeURIComponent(text)}`);
  };

  const removeRecent = (item: string) => {
    const next = readRecent().filter((r) => r !== item);
    writeRecent(next);
    setRecent(next);
  };

  const clearRecent = () => { writeRecent([]); setRecent([]); };

  const hasSuggest = q.trim().length > 0 && (suggest.products.length + suggest.brands.length + suggest.categories.length > 0);
  const showRecent = q.trim().length === 0 && recent.length > 0;

  return (
    <div ref={ref} className="hidden md:block flex-1 max-w-xl relative">
      <form onSubmit={submit}>
        <div className="flex border-2 border-brand-500 rounded">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            type="search"
            placeholder="상품명, 브랜드, 카테고리를 검색하세요"
            className="flex-1 px-4 py-2 outline-none text-sm bg-white"
          />
          <button type="submit" className="px-5 bg-brand-500 text-white text-sm font-medium hover:bg-brand-600">
            검색
          </button>
        </div>
      </form>

      {open && (showRecent || hasSuggest) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-[480px] overflow-y-auto z-50 animate-slide-down">
          {showRecent && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">최근 검색</span>
                <button type="button" onClick={clearRecent} className="text-[11px] text-gray-400 hover:text-gray-700">전체삭제</button>
              </div>
              <ul>
                {recent.map((r) => (
                  <li key={r} className="flex items-center hover:bg-gray-50 rounded">
                    <button
                      type="button"
                      onClick={() => { setQ(r); submit(); }}
                      className="flex-1 text-left px-3 py-2 text-sm text-gray-700"
                    >
                      <span className="text-gray-400 mr-2">⌖</span>{r}
                    </button>
                    <button
                      type="button"
                      aria-label="삭제"
                      onClick={() => removeRecent(r)}
                      className="px-3 text-gray-300 hover:text-rose-500 text-sm"
                    >×</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasSuggest && (
            <div className="p-2 space-y-3">
              {suggest.categories.length > 0 && (
                <div>
                  <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider px-2 py-1">카테고리</div>
                  <ul>
                    {suggest.categories.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/category/${c.slug}`}
                          onClick={() => setOpen(false)}
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 rounded"
                        >
                          🗂 {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {suggest.brands.length > 0 && (
                <div>
                  <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider px-2 py-1">브랜드</div>
                  <ul className="flex flex-wrap gap-1.5 px-2">
                    {suggest.brands.map((b) => (
                      <li key={b}>
                        <Link
                          href={`/products?q=${encodeURIComponent(b)}`}
                          onClick={() => { pushRecent(b); setOpen(false); }}
                          className="inline-flex items-center px-3 h-7 rounded-full bg-gray-100 text-gray-700 text-xs hover:bg-brand-50 hover:text-brand-700"
                        >
                          🏷 {b}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {suggest.products.length > 0 && (
                <div>
                  <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider px-2 py-1">상품</div>
                  <ul>
                    {suggest.products.map((p) => {
                      const finalPrice = p.salePrice ?? p.price;
                      return (
                        <li key={p.id}>
                          <Link
                            href={`/products/${p.id}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-2 py-2 rounded hover:bg-brand-50"
                          >
                            <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.thumbnail || "/images/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              {p.brand && <div className="text-[11px] text-gray-500">{p.brand}</div>}
                              <div className="text-sm text-gray-800 truncate">{p.name}</div>
                            </div>
                            <div className="text-sm font-bold text-gray-900 shrink-0">{formatKRW(finalPrice)}</div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="border-t border-gray-100 px-2 py-2">
                <button
                  type="button"
                  onClick={() => submit()}
                  className="w-full text-center text-xs text-brand-600 hover:text-brand-700 font-medium py-1"
                >
                  '{q}' 전체 결과 보기 →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
