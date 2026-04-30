"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type CouponFormValue = {
  id?: string;
  code: string;
  name: string;
  description: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number | "";
  minOrderAmount: number | "";
  maxDiscount: number | "" | null;
  totalQuantity: number | "" | null;
  validFrom: string;       // YYYY-MM-DD
  validUntil: string;
  isActive: boolean;
};

export default function CouponForm({
  mode, initial,
}: { mode: "create" | "edit"; initial: CouponFormValue }) {
  const router = useRouter();
  const [v, setV] = useState<CouponFormValue>(initial);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const set = <K extends keyof CouponFormValue>(k: K, val: CouponFormValue[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!v.code.trim()) return setErr("코드를 입력하세요.");
    if (!/^[A-Z0-9_-]+$/.test(v.code.trim())) return setErr("코드는 대문자/숫자/_/- 만 사용할 수 있습니다.");
    if (!v.name.trim()) return setErr("이름을 입력하세요.");
    if (typeof v.discountValue !== "number" || v.discountValue <= 0) return setErr("할인값을 입력하세요.");
    if (v.discountType === "PERCENT" && (v.discountValue > 100)) return setErr("정률 쿠폰은 100% 이하여야 합니다.");
    if (!v.validFrom || !v.validUntil) return setErr("유효기간을 입력하세요.");

    setLoading(true);
    try {
      const payload = {
        code: v.code.trim().toUpperCase(),
        name: v.name.trim(),
        description: v.description.trim() || null,
        discountType: v.discountType,
        discountValue: v.discountValue,
        minOrderAmount: typeof v.minOrderAmount === "number" ? v.minOrderAmount : 0,
        maxDiscount: typeof v.maxDiscount === "number" ? v.maxDiscount : null,
        totalQuantity: typeof v.totalQuantity === "number" ? v.totalQuantity : null,
        validFrom: new Date(v.validFrom).toISOString(),
        validUntil: new Date(v.validUntil + "T23:59:59").toISOString(),
        isActive: v.isActive,
      };

      const url = mode === "create" ? "/api/admin/coupons" : `/api/admin/coupons/${v.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      router.push("/admin/coupons");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{err}</div>
      )}

      <Section title="기본 정보">
        <div className="grid grid-cols-2 gap-3">
          <Field label="쿠폰 코드 *">
            <input
              className="input font-mono uppercase" maxLength={32}
              value={v.code} disabled={mode === "edit"}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="WELCOME2026"
            />
            <p className="text-[11px] text-gray-400 mt-1">회원이 등록할 때 사용하는 코드</p>
          </Field>
          <Field label="이름 *">
            <input className="input" value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="신규가입 환영 쿠폰" />
          </Field>
        </div>
        <Field label="설명">
          <input className="input" value={v.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </Section>

      <Section title="할인 조건">
        <div className="grid grid-cols-2 gap-3">
          <Field label="할인 종류 *">
            <select className="input" value={v.discountType} onChange={(e) => set("discountType", e.target.value as any)}>
              <option value="FIXED">정액 할인 (원)</option>
              <option value="PERCENT">정률 할인 (%)</option>
            </select>
          </Field>
          <Field label={v.discountType === "PERCENT" ? "할인율 (%)" : "할인액 (원) *"}>
            <input
              type="number" min={1} className="input"
              value={v.discountValue}
              onChange={(e) => set("discountValue", e.target.value === "" ? "" : Number(e.target.value))}
            />
          </Field>
          <Field label="최소 주문금액 (원)">
            <input
              type="number" min={0} className="input"
              value={v.minOrderAmount}
              onChange={(e) => set("minOrderAmount", e.target.value === "" ? "" : Number(e.target.value))}
            />
          </Field>
          {v.discountType === "PERCENT" && (
            <Field label="최대 할인액 (원)">
              <input
                type="number" min={0} className="input"
                value={v.maxDiscount ?? ""} placeholder="비워두면 제한 없음"
                onChange={(e) => set("maxDiscount", e.target.value === "" ? null : Number(e.target.value))}
              />
            </Field>
          )}
        </div>
      </Section>

      <Section title="발급 / 기간">
        <div className="grid grid-cols-2 gap-3">
          <Field label="발급 시작일 *">
            <input type="date" className="input" value={v.validFrom} onChange={(e) => set("validFrom", e.target.value)} />
          </Field>
          <Field label="발급 종료일 *">
            <input type="date" className="input" value={v.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
          </Field>
          <Field label="총 발급 수량">
            <input
              type="number" min={1} className="input"
              value={v.totalQuantity ?? ""} placeholder="비워두면 무제한"
              onChange={(e) => set("totalQuantity", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="활성 여부">
            <label className="flex items-center gap-2 mt-2 text-sm">
              <input type="checkbox" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              <span>활성 상태로 발급/사용 가능</span>
            </label>
          </Field>
        </div>
      </Section>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.push("/admin/coupons")} className="btn-outline h-10 text-sm">취소</button>
        <button type="submit" disabled={loading} className="btn-primary h-10 text-sm">
          {loading ? "저장 중..." : (mode === "create" ? "쿠폰 생성" : "변경 저장")}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded border border-gray-200 p-5 space-y-3">
      <h2 className="font-bold text-sm pb-3 border-b border-gray-100">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
