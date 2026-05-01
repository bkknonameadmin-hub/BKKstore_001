import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { restoreOrderStock } from "@/lib/stock";

/**
 * KG이니시스 Noti URL (서버 통보)
 * 결제창에서 사용자가 닫거나 네트워크 끊겨도 PG가 별도로 호출하여 결제 결과 통보
 *
 * 이니시스 가맹점 관리자에서 등록: 노티 URL = {NEXTAUTH_URL}/api/payments/inicis/notify
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((v, k) => { params[k] = String(v); });

  const oid = params.oid || params.MOID;
  const tid = params.tid || params.TID;
  const resultCode = params.resultCode || params.ResultCode;
  const cancelDate = params.cancelDate;

  if (!oid) return NextResponse.json({ ok: true, skip: "no oid" });

  const order = await prisma.order.findUnique({ where: { orderNo: oid } });
  if (!order) return NextResponse.json({ ok: true, skip: "no order" });

  try {
    // 결제 취소 통보
    if (resultCode === "00" && cancelDate) {
      if (order.status === "CANCELLED" || order.status === "REFUNDED") {
        return NextResponse.json({ ok: true });
      }
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", cancelledAt: new Date(), providerTxnId: tid || order.providerTxnId },
      });
      // 결제 후 취소시에만 재고 복원
      if (order.paidAt) await restoreOrderStock(order.id);
    }

    // 응답 형식: 이니시스는 "OK" 텍스트 반환 권장
    return new NextResponse("OK", { status: 200 });
  } catch (e: any) {
    console.error("[inicis-notify]", e);
    return new NextResponse("FAIL", { status: 500 });
  }
}
