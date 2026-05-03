"use client";
import { useRouter, useSearchParams } from "next/navigation";

type Chip = { key: string; value?: string; label: string };

type Props = {
  chips: Chip[];
};

export default function ActiveFilterChips({ chips }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  if (chips.length === 0) return null;

  const remove = (key: string, value?: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value !== undefined) {
      // 다중 값 (brand 등)
      const remaining = params.getAll(key).filter((v) => v !== value);
      params.delete(key);
      remaining.forEach((v) => params.append(key, v));
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  };

  const clearAll = () => {
    const q = sp.get("q");
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {chips.map((c, i) => (
        <button
          key={`${c.key}-${c.value ?? i}`}
          type="button"
          onClick={() => remove(c.key, c.value)}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-medium hover:bg-brand-100"
        >
          <span>{c.label}</span>
          <span className="text-brand-500 text-sm leading-none">×</span>
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="text-xs text-gray-500 hover:text-brand-600 underline underline-offset-2 ml-1"
      >전체 해제</button>
    </div>
  );
}
