import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { finalizeOrderPayment, restoreOrderStock } from "@/lib/stock";

/**
 * 토스페이먼츠 Webhook
 *
 * 토스 콘솔에서 등록: https://api.tosspayments.com 의 webhook URL
 * 헤더: TossPayments-Webhook-Signature (HMAC-SHA256, 비밀키 = TOSS_WEBHOOK_SECRET)
 * 이벤트: PAYMENT_STATUS_CHANGED, CANCELED, REFUNDED 등
 *
 * 결제창 닫혔거나 redirect 콜백 누락 시에도 이 webhook 으로 동기화 보장
 */

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.TOSS_WEBHOOK_SECRET;
  if (!secret) {
    // 미설정시 검증 스킵 (개발용) — 운영시 반드시 설정
    return process.env.NODE_ENV !== "production";
  }
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  // 타이밍 공격 방어
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("tosspayments-webhook-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "invalid payload" }, { status: 400 }); }

  const eventType = event?.eventType || event?.event;
  const data = event?.data || event;
  const orderNo = data?.orderId;
  const status = data?.status;
  const paymentKey = data?.paymentKey;

  if (!orderNo) return NextResponse.json({ ok: true, skip: "no orderId" });

  const order = await prisma.order.findUnique({ where: { orderNo } });
  if (!order) return NextResponse.json({ ok: true, skip: "no order" });

  try {
    // 결제 완료
    if (status === "DONE" && order.status === "PENDING") {
      if (data.totalAmount && data.totalAmount !== order.totalAmount) {
        return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
      }
      await finalizeOrderPayment({ orderId: order.id, providerTxnId: paymentKey || order.providerTxnId || "" });
    }
    // 취소/환불
    else if ((status === "CANCELED" || status === "PARTIAL_CANCELED") && order.status !== "CANCELLED") {
      const totalCanceled = data.balanceAmount === 0 || status === "CANCELED";
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: totalCanceled ? "CANCELLED" : "PARTIALLY_REFUNDED",
          cancelledAt: new Date(),
          refundedAmount: data.cancelAmount || order.totalAmount,
        },
      });
      if (totalCanceled) await restoreOrderStock(order.id);
    }
    // 만료
    else if (status === "EXPIRED" && order.status === "PENDING") {
      await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[toss-webhook]", e);
    return NextResponse.json({ error: e.message || "처리 실패" }, { status: 500 });
  }
}
