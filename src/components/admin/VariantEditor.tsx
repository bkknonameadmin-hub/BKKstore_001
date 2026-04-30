"use client";

export type VariantRow = {
  id?: string;          // 기존 변형의 PK (수정 시)
  name: string;
  colorHex: string;
  stock: number | "";
  priceModifier: number | "";
  sortOrder: number;
  isActive: boolean;
};

export const EMPTY_VARIANT: VariantRow = {
  name: "",
  colorHex: "#1e6fdc",
  stock: 0,
  priceModifier: 0,
  sortOrder: 0,
  isActive: true,
};

export default function VariantEditor({
  variants,
  onChange,
}: {
  variants: VariantRow[];
  onChange: (next: VariantRow[]) => void;
}) {
  const update = (i: number, patch: Partial<VariantRow>) => {
    const next = variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v));
    onChange(next);
  };
  const remove = (i: number) => onChange(variants.filter((_, idx) => idx !== i));
  const add = () => onChange([...variants, { ...EMPTY_VARIANT, sortOrder: variants.length }]);

  return (
    <div className="space-y-2">
      {variants.length === 0 ? (
        <p className="text-xs text-gray-500">옵션을 추가하지 않으면 단일 상품으로 판매됩니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead className="text-gray-500">
              <tr className="border-b border-gray-100">
                <th className="text-left py-1.5 w-10">순서</th>
                <th className="text-left py-1.5 w-12">색상</th>
                <th className="text-left py-1.5">옵션명 *</th>
                <th className="text-right py-1.5 w-24">재고 *</th>
                <th className="text-right py-1.5 w-28">추가금</th>
                <th className="text-center py-1.5 w-16">활성</th>
                <th className="text-center py-1.5 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-1.5 pr-2">
                    <input
                      type="number" className="input h-8 text-xs"
                      value={v.sortOrder}
                      onChange={(e) => update(i, { sortOrder: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="color" className="w-9 h-8 border border-gray-200 rounded cursor-pointer"
                      value={v.colorHex} onChange={(e) => update(i, { colorHex: e.target.value })}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      className="input h-8 text-xs" placeholder="예) 레드, 블루"
                      value={v.name} onChange={(e) => update(i, { name: e.target.value })}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number" min={0} className="input h-8 text-xs text-right"
                      value={v.stock}
                      onChange={(e) => update(i, { stock: e.target.value === "" ? "" : Number(e.target.value) })}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number" className="input h-8 text-xs text-right" placeholder="0"
                      value={v.priceModifier}
                      onChange={(e) => update(i, { priceModifier: e.target.value === "" ? "" : Number(e.target.value) })}
                    />
                  </td>
                  <td className="py-1.5 text-center">
                    <input
                      type="checkbox" checked={v.isActive}
                      onChange={(e) => update(i, { isActive: e.target.checked })}
                    />
                  </td>
                  <td className="py-1.5 text-center">
                    <button
                      type="button" onClick={() => remove(i)}
                      className="text-gray-400 hover:text-red-500 text-base"
                      title="옵션 삭제"
                    >×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button type="button" onClick={add} className="btn-outline h-8 text-xs">+ 옵션 추가 (색상)</button>
      <p className="text-[11px] text-gray-400">
        옵션을 1개 이상 추가하면 색상별로 재고가 관리됩니다. 추가금은 기본 판매가에 더해지는 금액입니다 (음수도 가능).
      </p>
    </div>
  );
}
