import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdminApi } from "@/lib/admin-guard";

const UpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  brand: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  price: z.number().int().min(0).optional(),
  salePrice: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
  thumbnail: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  categoryId: z.string().min(1).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const p = await prisma.product.findUnique({ where: { id: params.id } });
  if (!p) return NextResponse.json({ error: "상품 없음" }, { status: 404 });
  return NextResponse.json(p);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const data = UpdateSchema.parse(await req.json());

    if (typeof data.price === "number" && typeof data.salePrice === "number" && data.salePrice >= data.price) {
      return NextResponse.json({ error: "할인가는 판매가보다 낮아야 합니다." }, { status: 400 });
    }

    const updated = await prisma.product.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === "P2025") return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "수정 실패" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  // 주문 이력이 있으면 실삭제 대신 미판매(soft-disable) 처리
  const orderItemCount = await prisma.orderItem.count({ where: { productId: params.id } });
  if (orderItemCount > 0) {
    await prisma.product.update({ where: { id: params.id }, data: { isActive: false } });
    return NextResponse.json({ ok: true, softDeleted: true });
  }

  try {
    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ error: e.message || "삭제 실패" }, { status: 400 });
  }
}
