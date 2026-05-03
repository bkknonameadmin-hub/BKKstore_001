"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/cart";
import { toast } from "@/store/toast";
import { formatKRW } from "@/lib/utils";

type Variant = {
  id: string;
  name: string;
  colorHex?: string | null;
  optionType: string;
  stock: number;
  priceModifier: number;
  thumbnail?: string | null;
};

type Props = {
  product: {
    id: string;
    name: string;
    price: number;
    thumbnail?: string | null;
    stock: number;
  };
  variants: Variant[];
};

type SelectedItem = {
  variantId: string | null;
  variantName: string | null;
  unitPrice: number;
  stock: number;
  thumbnail?: string | null;
  quantity: number;
};

export default function AddToCartSection({ product, variants }: Props) {
  const router = useRouter();
  const add = useCart((s) => s.add);

  const hasVariants = variants.length > 0;
  const [singleQty, setSingleQty] = useState(1);
  const [selected, setSelected] = useState<SelectedItem[]>([]);

  const addVariant = (v: Variant) => {
    if (v.stock === 0) return;
    if (selected.find((s) => s.variantId === v.id)) return;
    setSelected((prev) => [
      ...prev,
      {
        variantId: v.id,
        variantName: v.name,
        unitPrice: product.price + v.priceModifier,
        stock: v.stock,
        thumbnail: v.thumbnail || product.thumbnail || null,
        quantity: 1,
      },
    ]);
  };

  const removeSelected = (variantId: string | null) =>
    setSelected((prev) => prev.filter((s) => s.variantId !== variantId));

  const updateQty = (variantId: string | null, qty: number) =>
    setSelected((prev) =>
      prev.map((s) => (s.variantId === variantId ? { ...s, quantity: Math.max(1, Math.min(qty, s.stock)) } : s))
    );

  const totalQty = hasVariants ? selected.reduce((n, s) => n + s.quantity, 0) : singleQty;
  const totalPrice = hasVariants
    ? selected.reduce((n, s) => n + s.quantity * s.unitPrice, 0)
    : product.price * singleQty;

  const submit = (goCheckout: boolean) => {
    if (hasVariants) {
      if (selected.length === 0) { toast.warning("옵션을 선택해주세요."); return; }
      for (const s of selected) {
        add({
          productId: product.id,
          variantId: s.variantId,
          variantName: s.variantName,
          name: product.name,
          price: s.unitPrice,
          thumbnail: s.thumbnail,
          quantity: s.quantity,
          stock: s.stock,
        });
      }
    } else {
      if (product.stock === 0) return;
      add({
        productId: product.id,
        variantId: null,
        variantName: null,
        name: product.name,
        price: product.price,
        thumbnail: product.thumbnail,
        quantity: singleQty,
        stock: product.stock,
      });
    }
    if (goCheckout) router.push("/cart");
    else toast.success("장바구니에 담았어요!", { href: "/cart", hrefLabel: "장바구니" });
  };

  return (
    <div className="mt-6 space-y-3">
      {hasVariants && (
        <>
          <div className="bg-gray-50 rounded p-3">
            <div className="text-sm font-bold mb-2">색상 선택 *</div>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => {
                const soldOut = v.stock === 0;
                const picked = !!selected.find((s) => s.variantId === v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => addVariant(v)}
                    disabled={soldOut || picked}
                    title={soldOut ? "품절" : picked ? "선택됨" : `재고 ${v.stock}개`}
                    className={`flex items-center gap-2 px-3 h-9 rounded border text-sm transition-colors ${
                      soldOut
                        ? "bg-gray-100 text-gray-400 line-through cursor-not-allowed"
                        : picked
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-300 hover:border-brand-500"
                    }`}
                  >
                    {v.colorHex && (
                      <span
                        className="inline-block w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: v.colorHex }}
                      />
                    )}
                    <span>{v.name}</span>
                    {v.priceModifier !== 0 && (
                      <span className="text-xs text-gray-400">
                        {v.priceModifier > 0 ? `+${formatKRW(v.priceModifier)}` : formatKRW(v.priceModifier)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selected.length > 0 && (
            <div className="space-y-2">
              {selected.map((s) => (
                <div key={s.variantId} className="border border-gray-200 rounded p-3 bg-white">
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="font-medium">{product.name} - <b>{s.variantName}</b></span>
                    <button onClick={() => removeSelected(s.variantId)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(s.variantId, s.quantity - 1)} className="w-7 h-7 border border-gray-300 rounded">−</button>
                      <input
                        value={s.quantity}
                        onChange={(e) => updateQty(s.variantId, parseInt(e.target.value || "1", 10) || 1)}
                        className="w-12 h-7 border border-gray-300 rounded text-center text-sm"
                      />
                      <button onClick={() => updateQty(s.variantId, s.quantity + 1)} className="w-7 h-7 border border-gray-300 rounded">+</button>
                      <span className="text-[11px] text-gray-400 ml-1">재고 {s.stock}</span>
                    </div>
                    <div className="text-sm font-bold">{formatKRW(s.unitPrice * s.quantity)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!hasVariants && (
        <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded">
          <span className="text-sm text-gray-700">수량</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSingleQty((q) => Math.max(1, q - 1))} disabled={product.stock === 0} className="w-8 h-8 border border-gray-300 rounded bg-white">−</button>
            <input
              value={singleQty}
              onChange={(e) => setSingleQty(Math.max(1, Math.min(product.stock || 1, parseInt(e.target.value || "1", 10) || 1)))}
              className="w-14 h-8 border border-gray-300 rounded text-center"
              disabled={product.stock === 0}
            />
            <button onClick={() => setSingleQty((q) => Math.min(product.stock || 1, q + 1))} disabled={product.stock === 0} className="w-8 h-8 border border-gray-300 rounded bg-white">+</button>
          </div>
        </div>
      )}

      <div className="flex items-baseline justify-between pt-3 border-t border-gray-200">
        <span className="text-sm text-gray-500">총 상품금액 ({totalQty}개)</span>
        <span className="text-2xl font-bold text-brand-700">{formatKRW(totalPrice)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => submit(false)}
          disabled={hasVariants ? selected.length === 0 : product.stock === 0}
          className="btn-outline h-12 text-base"
        >
          장바구니
        </button>
        <button
          onClick={() => submit(true)}
          disabled={hasVariants ? selected.length === 0 : product.stock === 0}
          className="btn-primary h-12 text-base"
        >
          {(!hasVariants && product.stock === 0) ? "품절" : "바로 구매하기"}
        </button>
      </div>
    </div>
  );
}
