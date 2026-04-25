"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/cart";
import { formatKRW } from "@/lib/utils";
import AddressSearch from "@/components/AddressSearch";

type Provider = "TOSS" | "INICIS" | "NAVERPAY";

const PROVIDERS: { value: Provider; label: string; desc: string }[] = [
  { value: "TOSS", label: "토스페이먼츠", desc: "신용/체크카드, 가상계좌, 간편결제" },
  { value: "INICIS", label: "KG이니시스", desc: "신용카드, 실시간계좌이체, 휴대폰결제" },
  { value: "NAVERPAY", label: "네이버페이", desc: "네이버 ID로 간편결제" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [memo, setMemo] = useState("");
  const [provider, setProvider] = useState<Provider>("TOSS");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!mounted) return null;
  if (items.length === 0) {
    if (typeof window !== "undefined") router.replace("/cart");
    return null;
  }

  const subtotal = totalPrice();
  const shipping = subtotal >= 50000 ? 0 : 3000;
  const total = subtotal + shipping;

  const submit = async () => {
    if (!recipient || !phone || !zipCode || !address1) {
      alert("배송 정보를 모두 입력해주세요.");
      return;
    }
    if (!agree) {
      alert("주문 내용을 확인하고 동의해주세요.");
      return;
    }

    setLoading(true);
    try {
      // 1. 주문 생성 (PENDING 상태로 DB 저장)
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          recipient, phone, zipCode, address1, address2, memo, provider,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "주문 생성 실패");

      // 2. 결제 게이트웨이로 이동
      if (provider === "TOSS") {
        const { loadTossPayments } = await import("@/lib/payments/toss-client");
        await loadTossPayments({
          orderId: data.orderNo,
          orderName: items[0].name + (items.length > 1 ? ` 외 ${items.length - 1}건` : ""),
          amount: total,
          customerName: recipient,
        });
      } else if (provider === "INICIS") {
        // 이니시스는 폼 submit 방식이 일반적입니다.
        const form = await (await fetch("/api/payments/inicis/prepare", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNo: data.orderNo, amount: total, name: recipient, phone, items }),
        })).json();
        // 이니시스 표준결제창 호출용 form 자동 submit
        startInicisPay(form);
      } else if (provider === "NAVERPAY") {
        const naver = await (await fetch("/api/payments/naver/reserve", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNo: data.orderNo, amount: total, items }),
        })).json();
        if (naver.redirectUrl) window.location.href = naver.redirectUrl;
      }

      // 결제 성공 후 콜백에서 장바구니 비움 처리
    } catch (e: any) {
      alert(e.message || "주문 처리 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="container-mall py-6">
      <h1 className="text-xl font-bold mb-6">주문/결제</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-8">
          {/* 주문상품 */}
          <section>
            <h2 className="font-bold mb-3 pb-2 border-b-2 border-gray-800">주문상품</h2>
            <ul className="divide-y divide-gray-200">
              {items.map((it) => (
                <li key={it.productId} className="py-3 flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.thumbnail || "/images/placeholder.svg"} alt={it.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm line-clamp-1">{it.name}</div>
                    <div className="text-xs text-gray-500">수량 {it.quantity}개</div>
                  </div>
                  <div className="font-bold text-sm">{formatKRW(it.price * it.quantity)}</div>
                </li>
              ))}
            </ul>
          </section>

          {/* 배송정보 */}
          <section>
            <h2 className="font-bold mb-3 pb-2 border-b-2 border-gray-800">배송지</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">받는 분 *</label>
                <input className="input" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
              </div>
              <div>
                <label className="label">연락처 *</label>
                <input className="input" placeholder="010-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="label">우편번호 *</label>
                <div className="flex gap-2">
                  <input
                    className="input flex-1" value={zipCode} readOnly
                    placeholder="우편번호 검색" onChange={(e) => setZipCode(e.target.value)}
                  />
                  <AddressSearch
                    onSelect={({ zipCode: z, address1: a }) => {
                      setZipCode(z);
                      setAddress1(a);
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="label">기본 주소 *</label>
                <input className="input" value={address1} readOnly placeholder="우편번호 검색을 먼저 진행하세요" />
              </div>
              <div className="col-span-2">
                <label className="label">상세 주소</label>
                <input className="input" value={address2} onChange={(e) => setAddress2(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">배송 메모</label>
                <input className="input" placeholder="예) 부재시 경비실에 맡겨주세요" value={memo} onChange={(e) => setMemo(e.target.value)} />
              </div>
            </div>
          </section>

          {/* 결제수단 */}
          <section>
            <h2 className="font-bold mb-3 pb-2 border-b-2 border-gray-800">결제수단</h2>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setProvider(p.value)}
                  className={`border rounded p-4 text-left transition-colors ${
                    provider === p.value ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <div className="font-bold">{p.label}</div>
                  <div className="text-xs text-gray-500 mt-1 leading-snug">{p.desc}</div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* 결제 요약 */}
        <aside className="border border-gray-200 rounded p-5 h-fit sticky top-32">
          <h3 className="font-bold mb-4">결제 정보</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">상품금액</dt><dd>{formatKRW(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">배송비</dt><dd>{shipping === 0 ? "무료" : formatKRW(shipping)}</dd></div>
          </dl>
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-baseline">
            <span className="text-sm font-bold">최종 결제금액</span>
            <span className="text-2xl font-bold text-brand-700">{formatKRW(total)}</span>
          </div>

          <label className="mt-4 flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
            <span>주문 내용을 확인하였으며, 결제진행에 동의합니다. (전자상거래법 등 관련 법규 및 이용약관 적용)</span>
          </label>

          <button onClick={submit} disabled={loading} className="btn-primary w-full h-12 mt-4 text-base">
            {loading ? "처리 중..." : `${formatKRW(total)} 결제하기`}
          </button>
        </aside>
      </div>
    </div>
  );
}

function startInicisPay(form: Record<string, string>) {
  // 이니시스 결제창 호출 - INIStdPay.js 가 head에 로드되어 있어야 함
  const f = document.createElement("form");
  f.method = "POST";
  f.action = "about:blank";
  f.target = "_self";
  Object.entries(form).forEach(([k, v]) => {
    const input = document.createElement("input");
    input.type = "hidden"; input.name = k; input.value = String(v);
    f.appendChild(input);
  });
  document.body.appendChild(f);
  // 실제로는 window.INIStdPay.pay(formId) 사용
  // @ts-ignore
  if (window.INIStdPay) window.INIStdPay.pay(f.id || (f.id = "ini-pay-form"));
  else alert("INIStdPay 스크립트가 로드되지 않았습니다. (테스트용 데모)");
}
