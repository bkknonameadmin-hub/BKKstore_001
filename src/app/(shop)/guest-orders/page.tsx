"use client";
import { useState } from "react";
import { formatKRW } from "@/lib/utils";

type OrderResult = {
  orderNo: string;
  status: string;
  totalAmount: number;
  shippingFee: number;
  itemsAmount: number;
  recipient: string;
  zipCode: string;
  address1: string;
  address2: string | null;
  memo: string | null;
  provider: string | null;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  courier: string | null;
  trackingNo: string | null;
  items: { id: string; name: string; variantName: string | null; price: number; quantity: number; productId: string }[];
};

const STATUS_KO: Record<string, string> = {
  PENDING: "결제대기",
  PAID: "결제완료",
  PREPARING: "배송준비",
  SHIPPED: "배송중",
  DELIVERED: "배송완료",
  CANCELLED: "취소",
  REFUNDED: "환불",
  PARTIALLY_REFUNDED: "부분환불",
};

export default function GuestOrderLookupPage() {
  const [orderNo, setOrderNo] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/orders/guest-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo: orderNo.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "조회 실패");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-mall py-10 max-w-2xl">
      <h1 className="text-xl font-bold">비회원 주문조회</h1>
      <p className="mt-2 text-sm text-gray-600">
        주문번호와 주문 시 입력하신 휴대폰 번호로 조회할 수 있습니다.
      </p>

      <form onSubmit={submit} className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
        <input
          required
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value)}
          placeholder="주문번호 (예: 20260504-XXXX)"
          className="input"
          autoComplete="off"
        />
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="휴대폰 (010-1234-5678)"
          className="input"
          autoComplete="tel"
          inputMode="tel"
        />
        <button type="submit" disabled={loading} className="btn-primary px-5">
          {loading ? "조회 중..." : "조회"}
        </button>
      </form>

      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}

      {result && (
        <section className="mt-8 border border-gray-200 rounded-md p-5 bg-white">
          <header className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <p className="text-xs text-gray-500">주문번호</p>
              <p className="font-mono text-sm">{result.orderNo}</p>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-brand-50 text-brand-700">
              {STATUS_KO[result.status] || result.status}
            </span>
          </header>

          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm">
            <div className="flex justify-between sm:block">
              <dt className="text-gray-500">결제일시</dt>
              <dd>{result.paidAt ? new Date(result.paidAt).toLocaleString("ko-KR") : "—"}</dd>
            </div>
            <div className="flex justify-between sm:block">
              <dt className="text-gray-500">결제수단</dt>
              <dd>{result.provider || "—"}</dd>
            </div>
            <div className="flex justify-between sm:block">
              <dt className="text-gray-500">받는분</dt>
              <dd>{result.recipient}</dd>
            </div>
            <div className="flex justify-between sm:block">
              <dt className="text-gray-500">주소</dt>
              <dd className="text-right sm:text-left">[{result.zipCode}] {result.address1} {result.address2 || ""}</dd>
            </div>
            {result.trackingNo && (
              <div className="flex justify-between sm:block sm:col-span-2">
                <dt className="text-gray-500">송장번호</dt>
                <dd className="font-mono">{result.courier || ""} {result.trackingNo}</dd>
              </div>
            )}
          </dl>

          <h2 className="mt-6 text-sm font-semibold">주문상품</h2>
          <ul className="mt-2 divide-y divide-gray-100 text-sm">
            {result.items.map((it) => (
              <li key={it.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p>{it.name}</p>
                  {it.variantName && <p className="text-xs text-gray-500">{it.variantName}</p>}
                </div>
                <div className="text-right">
                  <p>{formatKRW(it.price)} × {it.quantity}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-gray-100 pt-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-600">상품금액</span><span>{formatKRW(result.itemsAmount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">배송비</span><span>{formatKRW(result.shippingFee)}</span></div>
            <div className="flex justify-between font-bold text-base mt-1"><span>총 결제금액</span><span className="text-brand-600">{formatKRW(result.totalAmount)}</span></div>
          </div>
        </section>
      )}
    </div>
  );
}
