import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 네이버페이 결제예약 (서버→네이버) 후 결제URL을 받아 클라이언트에 전달
// 공식문서: https://developer.pay.naver.com/docs/v2/api
// (실연동시: clientId, clientSecret, chainId 필수)

export async function POST(req: NextRequest) {
  try {
    const { orderNo, amount, items } = await req.json();
    const order = await prisma.order.findUnique({ where: { orderNo } });
    if (!order || order.totalAmount !== amount) {
      return NextResponse.json({ error: "주문 정보 불일치" }, { status: 400 });
    }

    const clientId = process.env.NAVERPAY_CLIENT_ID;
    const clientSecret = process.env.NAVERPAY_CLIENT_SECRET;
    const chainId = process.env.NAVERPAY_CHAIN_ID;

    // 환경변수 미설정시 데모용 반환 (실제 결제 발생하지 않음)
    if (!clientId || !clientSecret || !chainId) {
      return NextResponse.json({
        redirectUrl: `${req.nextUrl.origin}/checkout/fail?reason=네이버페이_미설정`,
        notice: "NAVERPAY_* 환경변수가 설정되지 않았습니다. .env 에서 설정해주세요.",
      });
    }

    const origin = req.nextUrl.origin;
    const reserveBody = {
      merchantPayKey: orderNo,
      productName: items[0]?.name || `주문 ${orderNo}`,
      totalPayAmount: amount,
      taxScopeAmount: amount,
      taxExScopeAmount: 0,
      productCount: items.reduce((s: number, it: any) => s + it.quantity, 0),
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

    // 클라이언트에서 이 URL 로 리다이렉트하면 네이버페이 결제창 열림
    return NextResponse.json({
      redirectUrl: `https://dev.apis.naver.com/${chainId}/naverpay/payments/v2/checkout?reserveId=${json.body.reserveId}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
