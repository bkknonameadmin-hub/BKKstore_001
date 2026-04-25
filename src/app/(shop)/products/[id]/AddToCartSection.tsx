"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/cart";
import { formatKRW } from "@/lib/utils";

type Props = {
  product: {
    id: string;
    name: string;
    price: number;
    thumbnail?: string | null;
    stock: number;
  };
};

export default function AddToCartSection({ product }: Props) {
  const [qty, setQty] = useState(1);
  const router = useRouter();
  const add = useCart((s) => s.add);

  const max = Math.max(1, product.stock);
  const total = product.price * qty;

  const handleAdd = (goCheckout = false) => {
    add({
      productId: product.id,
      name: product.name,
      price: product.price,
      thumbnail: product.thumbnail,
      quantity: qty,
      stock: product.stock,
    });
    if (goCheckout) router.push("/cart");
    else alert("장바구니에 담았습니다.");
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded">
        <span className="text-sm text-gray-700">수량</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-8 h-8 border border-gray-300 rounded bg-white"
            disabled={product.stock === 0}
          >
            −
          </button>
          <input
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(max, parseInt(e.target.value || "1", 10) || 1)))}
            className="w-14 h-8 border border-gray-300 rounded text-center"
            disabled={product.stock === 0}
          />
          <button
            onClick={() => setQty((q) => Math.min(max, q + 1))}
            className="w-8 h-8 border border-gray-300 rounded bg-white"
            disabled={product.stock === 0}
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-sm text-gray-500">총 상품금액</span>
        <span className="text-2xl font-bold text-brand-700">{formatKRW(total)}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => handleAdd(false)}
          disabled={product.stock === 0}
          className="btn-outline h-12 text-base"
        >
          장바구니
        </button>
        <button
          onClick={() => handleAdd(true)}
          disabled={product.stock === 0}
          className="btn-primary h-12 text-base"
        >
          {product.stock === 0 ? "품절" : "바로 구매하기"}
        </button>
      </div>
    </div>
  );
}
