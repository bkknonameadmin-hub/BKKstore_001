import Link from "next/link";
import { calcDiscountRate, formatKRW } from "@/lib/utils";

type Props = {
  id: string;
  name: string;
  brand?: string | null;
  price: number;
  salePrice?: number | null;
  thumbnail?: string | null;
};

export default function ProductCard({ id, name, brand, price, salePrice, thumbnail }: Props) {
  const finalPrice = salePrice ?? price;
  const discount = calcDiscountRate(price, salePrice ?? null);

  return (
    <Link href={`/products/${id}`} className="group block">
      <div className="aspect-square bg-gray-100 rounded overflow-hidden border border-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnail || "/images/placeholder.svg"}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
      </div>
      <div className="mt-2 px-1">
        {brand && <div className="text-xs text-gray-500">{brand}</div>}
        <div className="text-sm text-gray-800 line-clamp-2 leading-snug min-h-[2.5em]">{name}</div>
        <div className="mt-1 flex items-baseline gap-2">
          {discount > 0 && <span className="text-accent-500 font-bold text-sm">{discount}%</span>}
          <span className="text-base font-bold">{formatKRW(finalPrice)}</span>
        </div>
        {discount > 0 && (
          <div className="text-xs text-gray-400 line-through">{formatKRW(price)}</div>
        )}
      </div>
    </Link>
  );
}
