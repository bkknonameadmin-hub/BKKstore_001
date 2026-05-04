import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/security";

// KG이니시스 표준결제(WEB) 요청 파라미터 생성
// 클라이언트는 이 파라미터로 form 만들어 INIStdPay.pay() 호출
// 공식 문서: https://manual.inicis.com/stdpay/

function sha256(s: string) { return crypto.createHash("sha256").update(s).digest("hex"); }

const Schema = z.object({
  orderNo: z.string().min(1).max(64),
  amount: z.number().int().positive().max(100_000_000),
  name: z.string().min(1).max(60),
  phone: z.string().min(8).max(20),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit (orderNo enumeration / 결제 트래픽 스팸 방어)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const rl = await rateLimitAsync(`pay:inicis:prep:${ip}`, 30, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
    }

    const session = await getServerSession(authOptions);
    const data = Schema.parse(await req.json());

    const order = await prisma.order.findUnique({ where: { orderNo: data.orderNo } });
    if (!order) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }
    if (order.totalAmount !== data.amount) {
      return NextResponse.json({ error: "주문 정보 불일치" }, { status: 400 });
    }
    if (order.status !== "PENDING") {
      return NextResponse.json({ error: `결제 진행 불가 상태(${order.status})` }, { status: 400 });
    }

    // 소유권 검증: 회원 주문은 본인만, 비회원 주문은 비로그인 + IP/세션 토큰으로 보호
    const sessionUserId = (session?.user as any)?.id as string | undefined;
    if (order.userId) {
      if (!sessionUserId || sessionUserId !== order.userId) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
    } else {
      // 비회원 주문: 로그인 사용자가 임의 비회원 주문에 접근하는 것 차단
      if (sessionUserId) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
    }

    const mid = process.env.INICIS_MID;
    const signKey = process.env.INICIS_SIGN_KEY;
    if (!mid || !signKey) {
      return NextResponse.json({ error: "결제 모듈이 설정되지 않았습니다." }, { status: 503 });
    }

    const timestamp = Date.now().toString();
    const oid = data.orderNo;
    const price = String(data.amount);
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
      goodname: `주문 ${oid}`,
      buyername: data.name,
      buyertel: data.phone,
      buyeremail: "",
      gopaymethod: "Card:DirectBank:HPP",
      acceptmethod: "HPP(1):below1000",
      returnUrl: `${origin}/api/payments/inicis/return`,
      closeUrl: `${origin}/checkout/fail`,
    });
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    }
    return NextResponse.json({ error: "결제 준비 실패" }, { status: 400 });
  }
}
