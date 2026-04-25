import { NextRequest, NextResponse } from "next/server";
import { trackShipment } from "@/lib/tracker";

// 공개 API (송장번호만 알면 추적 가능)
// 운영 환경에서는 주문번호 + 받는분 이름 조합으로 인증 추가 권장

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const courier = searchParams.get("courier");
  const invoice = searchParams.get("invoice");

  if (!courier || !invoice) {
    return NextResponse.json({ error: "courier 와 invoice 파라미터가 필요합니다." }, { status: 400 });
  }

  const result = await trackShipment(courier, invoice);
  return NextResponse.json(result);
}
