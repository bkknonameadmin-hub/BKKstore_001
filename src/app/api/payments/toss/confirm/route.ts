import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finalizeOrderPayment } from "@/lib/stock";

// 토스페이먼츠 successUrl 콜백
// 클라이언트에서 결제 승인되면 paymentKey, orderId, amount 가 쿼리로 전달됨
// 서버에서 시크릿키로 결제 승인 API 호출하여 최종 승인 처리

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId"); // = orderNo
  const amount = Number(searchParams.get("amount"));

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.redirect(new URL("/checkout/fail?reason=invalid", req.url));
  }

  // 1. DB의 주문과 금액이 일치하는지 검증 (위변조 방어)
  const order = await prisma.order.findUnique({ where: { orderNo: orderId } });
  if (!order || order.totalAmount !== amount) {
    return NextResponse.redirect(new URL("/checkout/fail?reason=mismatch", req.url));
  }

  // 2. 토스페이먼츠 승인 API 호출
  const secretKey = process.env.TOSS_SECRET_KEY!;
  const basicAuth = Buffer.from(secretKey + ":").toString("base64");

  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  const data = await res.json();

  if (!res.ok) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    return NextResponse.redirect(new URL(`/checkout/fail?reason=${encodeURIComponent(data.message || "")}`, req.url));
  }

  // 3. 주문 상태 PAID 로 변경 + 재고 차감 + 임계치 알림
  await finalizeOrderPayment({ orderId: order.id, providerTxnId: paymentKey });

  return NextResponse.redirect(new URL(`/checkout/success?orderNo=${order.orderNo}`, req.url));
}
