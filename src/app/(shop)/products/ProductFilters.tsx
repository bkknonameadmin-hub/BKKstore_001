"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type SP = { [k: string]: string | string[] | undefined };

type PriceProps = {
  kind: "price";
  options: { label: string; min: number; max: number }[];
  currentMin: number | null;
  currentMax: number | null;
  currentSearchParams: SP;
};

type BrandProps = {
  kind: "brand";
  options: { label: string; value: string }[];
  currentSelected: string[];
  currentSearchParams: SP;
};

type Props = PriceProps | BrandProps;

export default function ProductFilters(props: Props) {
  if (props.kind === "price") return <PriceFilter {...props} />;
  return <BrandFilter {...props} />;
}

function PriceFilter({ options, currentMin, currentMax }: PriceProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [min, setMin] = useState<string>(currentMin?.toString() || "");
  const [max, setMax] = useState<string>(currentMax?.toString() || "");

  const apply = (m: number | null, mx: number | null) => {
    const params = new URLSearchParams(sp.toString());
    if (m !== null) params.set("min", String(m)); else params.delete("min");
    if (mx !== null) params.set("max", String(mx)); else params.delete("max");
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  };

  const isCurrent = (a: number, b: number) => currentMin === a && currentMax === b;

  return (
    <div>
      <ul className="space-y-1.5 text-sm mb-3">
        <li>
          <button
            onClick={() => apply(null, null)}
            className={!currentMin && !currentMax ? "text-brand-600 font-semibold" : "text-gray-700 hover:text-brand-600"}
          >전체</button>
        </li>
        {options.map((o) => (
          <li key={o.label}>
            <button
              onClick={() => apply(o.min, o.max)}
              className={isCurrent(o.min, o.max) ? "text-brand-600 font-semibold" : "text-gray-700 hover:text-brand-600"}
            >
              {o.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-gray-100 pt-3 space-y-2">
        <div className="text-[11px] text-gray-500">직접 입력</div>
        <div className="flex items-center gap-1">
          <input
            type="number" placeholder="최소" min={0}
            value={min} onChange={(e) => setMin(e.target.value)}
            className="input h-8 text-xs flex-1 min-w-0"
          />
          <span className="text-xs text-gray-400">~</span>
          <input
            type="number" placeholder="최대" min={0}
            value={max} onChange={(e) => setMax(e.target.value)}
            className="input h-8 text-xs flex-1 min-w-0"
          />
        </div>
        <button
          onClick={() => apply(min ? Number(min) : null, max ? Number(max) : null)}
          className="btn-primary w-full h-8 text-xs"
        >적용</button>
      </div>
    </div>
  );
}

function BrandFilter({ options, currentSelected }: BrandProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? options : options.slice(0, 8);

  const toggle = (brand: string) => {
    const params = new URLSearchParams(sp.toString());
    const current = params.getAll("brand");
    params.delete("brand");
    if (current.includes(brand)) {
      current.filter((b) => b !== brand).forEach((b) => params.append("brand", b));
    } else {
      [...current, brand].forEach((b) => params.append("brand", b));
    }
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div>
      <ul className="space-y-1 text-sm">
        {visible.map((o) => {
          const checked = currentSelected.includes(o.value);
          return (
            <li key={o.value}>
              <label className="flex items-center gap-2 cursor-pointer hover:text-brand-600">
                <input
                  type="checkbox" checked={checked}
                  onChange={() => toggle(o.value)}
                  className="cursor-pointer"
                />
                <span className={checked ? "text-brand-600 font-semibold" : "text-gray-700"}>{o.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {options.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-[11px] text-gray-500 hover:text-brand-600"
        >
          {showAll ? "접기" : `+ ${options.length - 8}개 더 보기`}
        </button>
      )}
    </div>
  );
}
