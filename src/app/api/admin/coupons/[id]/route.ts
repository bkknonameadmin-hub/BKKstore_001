import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdminApi } from "@/lib/admin-guard";
import { audit } from "@/lib/audit";

const Schema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().nullable().optional(),
  discountType: z.enum(["PERCENT", "FIXED"]).optional(),
  discountValue: z.number().int().positive().optional(),
  minOrderAmount: z.number().int().min(0).optional(),
  maxDiscount: z.number().int().positive().nullable().optional(),
  totalQuantity: z.number().int().positive().nullable().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const data = Schema.parse(await req.json());
    const update: any = { ...data };
    if (data.validFrom) update.validFrom = new Date(data.validFrom);
    if (data.validUntil) update.validUntil = new Date(data.validUntil);

    if (update.validFrom && update.validUntil && update.validUntil <= update.validFrom) {
      return NextResponse.json({ error: "종료일은 시작일 이후여야 합니다." }, { status: 400 });
    }
    if (data.discountType === "PERCENT" && data.discountValue && data.discountValue > 100) {
      return NextResponse.json({ error: "정률 쿠폰은 100% 이하여야 합니다." }, { status: 400 });
    }

    const updated = await prisma.coupon.update({ where: { id: params.id }, data: update });
    await audit({
      actorId: guard.session?.user?.id, actorEmail: guard.session?.user?.email,
      action: "coupon.update", targetType: "Coupon", targetId: params.id,
      metadata: { fields: Object.keys(data) },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === "P2025") return NextResponse.json({ error: "쿠폰을 찾을 수 없습니다." }, { status: 404 });
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "수정 실패" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  // 발급된 쿠폰이 있으면 비활성화 처리 (실삭제 시 외래키 무결성 문제)
  const issuedCount = await prisma.userCoupon.count({ where: { couponId: params.id } });
  if (issuedCount > 0) {
    await prisma.coupon.update({ where: { id: params.id }, data: { isActive: false } });
    await audit({
      actorId: guard.session?.user?.id, actorEmail: guard.session?.user?.email,
      action: "coupon.soft_delete", targetType: "Coupon", targetId: params.id,
      metadata: { issuedCount },
    });
    return NextResponse.json({ ok: true, softDeleted: true, message: `발급된 쿠폰 ${issuedCount}건 — 비활성화 처리됨` });
  }

  try {
    await prisma.coupon.delete({ where: { id: params.id } });
    await audit({
      actorId: guard.session?.user?.id, actorEmail: guard.session?.user?.email,
      action: "coupon.delete", targetType: "Coupon", targetId: params.id,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") return NextResponse.json({ error: "쿠폰을 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ error: e.message || "삭제 실패" }, { status: 400 });
  }
}
