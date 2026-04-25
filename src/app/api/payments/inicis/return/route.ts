import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// KG이니시스 returnUrl 콜백 (POST form-urlencoded)
// 인증성공시 authToken 등을 받아 승인 API 호출 → 최종 결제 완료

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((v, k) => { params[k] = String(v); });

  const resultCode = params.resultCode;
  const oid = params.oid;
  const authToken = params.authToken;
  const authUrl = params.authUrl;     // 승인요청 URL (이니시스가 내려줌)
  const mid = params.mid;
  const netCancelUrl = params.netCancelUrl; // 망취소 URL

  if (resultCode !== "0000" || !authToken || !authUrl) {
    return NextResponse.redirect(new URL(`/checkout/fail?reason=${encodeURIComponent(params.resultMsg || "")}`, req.url));
  }

  const order = await prisma.order.findUnique({ where: { orderNo: oid } });
  if (!order) {
    return NextResponse.redirect(new URL("/checkout/fail?reason=주문없음", req.url));
  }

  // 승인 요청 (form-urlencoded)
  const body = new URLSearchParams({
    mid,
    authToken,
    timestamp: Date.now().toString(),
    charset: "UTF-8",
    format: "JSON",
  });

  let approveJson: any;
  try {
    const res = await fetch(authUrl, { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    approveJson = await res.json();
  } catch (e) {
    if (netCancelUrl) {
      await fetch(netCancelUrl, { method: "POST", body }).catch(() => {});
    }
    return NextResponse.redirect(new URL("/checkout/fail?reason=승인실패", req.url));
  }

  if (approveJson.resultCode !== "0000") {
    return NextResponse.redirect(new URL(`/checkout/fail?reason=${encodeURIComponent(approveJson.resultMsg)}`, req.url));
  }

  const paidAmount = Number(approveJson.TotPrice);
  if (paidAmount !== order.totalAmount) {
    // 위변조 의심 — 망취소
    if (netCancelUrl) await fetch(netCancelUrl, { method: "POST", body }).catch(() => {});
    return NextResponse.redirect(new URL("/checkout/fail?reason=금액불일치", req.url));
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", providerTxnId: approveJson.tid, paidAt: new Date() },
    });
    const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
    for (const it of items) {
      await tx.product.update({ where: { id: it.productId }, data: { stock: { decrement: it.quantity } } });
    }
  });

  return NextResponse.redirect(new URL(`/checkout/success?orderNo=${order.orderNo}`, req.url));
}
