"use client";
import { useRouter, useSearchParams } from "next/navigation";

const SORT_OPTIONS = [
  { value: "new",     label: "신상품순" },
  { value: "best",    label: "인기순" },
  { value: "rating",  label: "평점순" },
  { value: "reviews", label: "리뷰많은순" },
  { value: "low",     label: "낮은가격순" },
  { value: "high",    label: "높은가격순" },
];

export default function SortSelectMobile({ sort }: { sort: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(sp.toString());
    params.set("sort", e.target.value);
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  };

  return (
    <select
      value={sort}
      onChange={onChange}
      aria-label="정렬"
      className="md:hidden h-9 px-3 pr-7 border border-gray-300 rounded-full text-sm bg-white"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
