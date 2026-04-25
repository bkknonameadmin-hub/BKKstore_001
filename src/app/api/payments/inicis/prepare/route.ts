import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// KG이니시스 표준결제(WEB) 요청 파라미터 생성
// 클라이언트는 이 파라미터로 form 만들어 INIStdPay.pay() 호출
// 공식 문서: https://manual.inicis.com/stdpay/

function sha256(s: string) { return crypto.createHash("sha256").update(s).digest("hex"); }

export async function POST(req: NextRequest) {
  try {
    const { orderNo, amount, name, phone } = await req.json();
    const order = await prisma.order.findUnique({ where: { orderNo } });
    if (!order || order.totalAmount !== amount) {
      return NextResponse.json({ error: "주문 정보 불일치" }, { status: 400 });
    }

    const mid = process.env.INICIS_MID || "INIpayTest";
    const signKey = process.env.INICIS_SIGN_KEY || "SU5JTElURV9UUklQTEVERVNfS0VZU1RS";

    const timestamp = Date.now().toString();
    const oid = orderNo;
    const price = String(amount);
    const signature = sha256(`oid=${oid}&price=${price}&timestamp=${timestamp}`);
    const verification = sha256(`oid=${oid}&price=${price}&signKey=${signKey}&timestamp=${timestamp}`);
    const mKey = sha256(signKey);

    const origin = req.nextUrl.origin;

    return NextResponse.json({
      version: "1.0",
      mid,
      oid,
      price,
      timestamp,
      signature,
      verification,
      mKey,
      currency: "WON",
      goodname: `주문 ${orderNo}`,
      buyername: name,
      buyertel: phone,
      buyeremail: "",
      gopaymethod: "Card:DirectBank:HPP",
      acceptmethod: "HPP(1):below1000",
      returnUrl: `${origin}/api/payments/inicis/return`,
      closeUrl: `${origin}/checkout/fail`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
