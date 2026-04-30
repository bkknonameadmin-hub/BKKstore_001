import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const userId = (session.user as any).id as string;

  const [user, userCoupons] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { pointBalance: true } }),
    prisma.userCoupon.findMany({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
      include: { coupon: true },
      orderBy: { expiresAt: "asc" },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "회원 정보 없음" }, { status: 404 });

  const coupons = userCoupons
    .filter((uc) => uc.coupon.isActive && uc.coupon.validFrom <= new Date() && uc.coupon.validUntil >= new Date())
    .map((uc) => ({
      id: uc.id,
      couponName: uc.coupon.name,
      discountType: uc.coupon.discountType,
      discountValue: uc.coupon.discountValue,
      minOrderAmount: uc.coupon.minOrderAmount,
      maxDiscount: uc.coupon.maxDiscount,
      expiresAt: uc.expiresAt,
    }));

  return NextResponse.json({
    pointBalance: user.pointBalance,
    coupons,
  });
}
