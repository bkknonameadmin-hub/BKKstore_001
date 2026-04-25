import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 네이버페이 결제 완료 후 returnUrl 콜백
// resultCode=Success 인 경우 paymentId 로 승인 API 호출

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const resultCode = searchParams.get("resultCode");
  const paymentId = searchParams.get("paymentId");
  const merchantPayKey = searchParams.get("merchantPayKey"); // = orderNo

  if (resultCode !== "Success" || !paymentId || !merchantPayKey) {
    return NextResponse.redirect(new URL(`/checkout/fail?reason=${encodeURIComponent(searchParams.get("resultMessage") || "")}`, req.url));
  }

  const order = await prisma.order.findUnique({ where: { orderNo: merchantPayKey } });
  if (!order) return NextResponse.redirect(new URL("/checkout/fail?reason=주문없음", req.url));

  const clientId = process.env.NAVERPAY_CLIENT_ID!;
  const clientSecret = process.env.NAVERPAY_CLIENT_SECRET!;
  const chainId = process.env.NAVERPAY_CHAIN_ID!;

  // 승인(approve) 호출
  const res = await fetch("https://dev-pub.apis.naver.com/naverpay-partner/naverpay/payments/v1/apply/payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
      "X-NaverPay-Chain-Id": chainId,
    },
    body: new URLSearchParams({ paymentId }),
  });
  const json = await res.json();

  if (json.code !== "Success") {
    return NextResponse.redirect(new URL(`/checkout/fail?reason=${encodeURIComponent(json.message)}`, req.url));
  }

  const paid = Number(json.body.detail.totalPayAmount);
  if (paid !== order.totalAmount) {
    return NextResponse.redirect(new URL("/checkout/fail?reason=금액불일치", req.url));
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", providerTxnId: paymentId, paidAt: new Date() },
    });
    const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
    for (const it of items) {
      await tx.product.update({ where: { id: it.productId }, data: { stock: { decrement: it.quantity } } });
    }
  });

  return NextResponse.redirect(new URL(`/checkout/success?orderNo=${order.orderNo}`, req.url));
}
