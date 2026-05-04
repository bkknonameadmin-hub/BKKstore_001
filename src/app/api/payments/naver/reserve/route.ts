import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertOrderOwnership } from "@/lib/payments/order-access";
import { rateLimitAsync } from "@/lib/security";

// 네이버페이 결제예약 (서버→네이버) 후 결제URL을 받아 클라이언트에 전달
// 공식문서: https://developer.pay.naver.com/docs/v2/api

const Schema = z.object({
  orderNo: z.string().min(1).max(64),
  amount: z.number().int().positive().max(100_000_000),
  items: z.array(z.object({
    name: z.string().max(200).optional(),
    quantity: z.number().int().positive(),
  })).min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const rl = await rateLimitAsync(`pay:naver:reserve:${ip}`, 30, 60_000);
    if (!rl.ok) return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });

    const data = Schema.parse(await req.json());

    const order = await prisma.order.findUnique({ where: { orderNo: data.orderNo } });
    if (!order) return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    if (order.totalAmount !== data.amount) {
      return NextResponse.json({ error: "주문 정보 불일치" }, { status: 400 });
    }
    if (order.status !== "PENDING") {
      return NextResponse.json({ error: `결제 진행 불가 상태(${order.status})` }, { status: 400 });
    }

    const own = await assertOrderOwnership(order);
    if (!own.ok) return NextResponse.json({ error: own.error }, { status: own.status });

    const clientId = process.env.NAVERPAY_CLIENT_ID;
    const clientSecret = process.env.NAVERPAY_CLIENT_SECRET;
    const chainId = process.env.NAVERPAY_CHAIN_ID;

    if (!clientId || !clientSecret || !chainId) {
      return NextResponse.json({
        error: "네이버페이가 설정되지 않았습니다.",
      }, { status: 503 });
    }

    const origin = req.nextUrl.origin;
    const reserveBody = {
      merchantPayKey: data.orderNo,
      productName: data.items[0]?.name || `주문 ${data.orderNo}`,
      totalPayAmount: data.amount,
      taxScopeAmount: data.amount,
      taxExScopeAmount: 0,
      productCount: data.items.reduce((s: number, it) => s + it.quantity, 0),
      returnUrl: `${origin}/api/payments/naver/return`,
    };

    const res = await fetch("https://dev-pub.apis.naver.com/naverpay-partner/naverpay/payments/v2.2/reserve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
        "X-NaverPay-Chain-Id": chainId,
      },
      body: JSON.stringify(reserveBody),
    });
    const json = await res.json();

    if (json.code !== "Success") {
      return NextResponse.json({ error: json.message || "예약 실패" }, { status: 400 });
    }

    return NextResponse.json({
      redirectUrl: `https://dev.apis.naver.com/${chainId}/naverpay/payments/v2/checkout?reserveId=${json.body.reserveId}`,
    });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: "결제 예약 실패" }, { status: 400 });
  }
}
