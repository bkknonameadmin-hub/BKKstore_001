import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync, getClientInfo } from "@/lib/security";

const Schema = z.object({ code: z.string().min(1).max(64) });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { ip } = getClientInfo(req);
  const rl = await rateLimitAsync(`redeem:${userId}:${ip || ""}`, 10, 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 429 });

  try {
    const { code } = Schema.parse(await req.json());
    const upper = code.trim().toUpperCase();

    const coupon = await prisma.coupon.findUnique({ where: { code: upper } });
    if (!coupon) return NextResponse.json({ error: "유효하지 않은 코드입니다." }, { status: 404 });
    if (!coupon.isActive) return NextResponse.json({ error: "사용할 수 없는 쿠폰입니다." }, { status: 400 });

    const now = new Date();
    if (coupon.validFrom > now) return NextResponse.json({ error: "아직 사용할 수 없습니다." }, { status: 400 });
    if (coupon.validUntil < now) return NextResponse.json({ error: "기간이 만료되었습니다." }, { status: 400 });

    if (coupon.totalQuantity != null && coupon.issuedCount >= coupon.totalQuantity) {
      return NextResponse.json({ error: "발급 수량이 모두 소진되었습니다." }, { status: 400 });
    }

    const exists = await prisma.userCoupon.findUnique({
      where: { userId_couponId: { userId, couponId: coupon.id } },
    });
    if (exists) return NextResponse.json({ error: "이미 등록한 쿠폰입니다." }, { status: 409 });

    await prisma.$transaction([
      prisma.userCoupon.create({
        data: {
          userId,
          couponId: coupon.id,
          expiresAt: coupon.validUntil,
        },
      }),
      prisma.coupon.update({
        where: { id: coupon.id },
        data: { issuedCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ ok: true, couponName: coupon.name });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "등록 실패" }, { status: 400 });
  }
}
