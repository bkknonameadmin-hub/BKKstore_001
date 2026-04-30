import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdminApi } from "@/lib/admin-guard";

const Schema = z.object({
  code: z.string().min(1).max(64).regex(/^[A-Z0-9_-]+$/, "코드는 대문자/숫자/_/- 만 사용할 수 있습니다."),
  name: z.string().min(1).max(80),
  description: z.string().nullable().optional(),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.number().int().positive(),
  minOrderAmount: z.number().int().min(0).default(0),
  maxDiscount: z.number().int().positive().nullable().optional(),
  totalQuantity: z.number().int().positive().nullable().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const data = Schema.parse(await req.json());
    if (data.discountType === "PERCENT" && data.discountValue > 100) {
      return NextResponse.json({ error: "정률 쿠폰은 100% 이하여야 합니다." }, { status: 400 });
    }
    const validFrom = new Date(data.validFrom);
    const validUntil = new Date(data.validUntil);
    if (validUntil <= validFrom) {
      return NextResponse.json({ error: "종료일은 시작일 이후여야 합니다." }, { status: 400 });
    }

    const dup = await prisma.coupon.findUnique({ where: { code: data.code.toUpperCase() } });
    if (dup) return NextResponse.json({ error: "이미 사용 중인 코드입니다." }, { status: 409 });

    const created = await prisma.coupon.create({
      data: {
        ...data,
        code: data.code.toUpperCase(),
        validFrom, validUntil,
      },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "생성 실패" }, { status: 400 });
  }
}

export async function GET() {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(coupons);
}
