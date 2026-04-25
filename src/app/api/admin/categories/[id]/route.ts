import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdminApi } from "@/lib/admin-guard";

const Schema = z.object({
  name: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const data = Schema.parse(await req.json());

    // 자기 자신을 부모로 삼거나, 자식을 부모로 삼는 순환 방지
    if (data.parentId === params.id) {
      return NextResponse.json({ error: "자기 자신을 부모로 설정할 수 없습니다." }, { status: 400 });
    }
    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) return NextResponse.json({ error: "상위 카테고리가 없습니다." }, { status: 400 });
      if (parent.parentId === params.id) {
        return NextResponse.json({ error: "순환 구조가 됩니다." }, { status: 400 });
      }
      // 본인이 부모(자식 보유)인 경우, 자기 밑으로 들어가면 안됨 - 단계 제한 (2depth)
      const hasChildren = await prisma.category.count({ where: { parentId: params.id } });
      if (hasChildren > 0) {
        return NextResponse.json({ error: "하위 카테고리가 있는 카테고리는 다른 카테고리의 하위로 이동할 수 없습니다." }, { status: 400 });
      }
    }

    const updated = await prisma.category.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === "P2025") return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "수정 실패" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  // 하위 카테고리 또는 상품이 있으면 삭제 불가
  const [childCount, productCount] = await Promise.all([
    prisma.category.count({ where: { parentId: params.id } }),
    prisma.product.count({ where: { categoryId: params.id } }),
  ]);
  if (childCount > 0) {
    return NextResponse.json({ error: "하위 카테고리가 있어 삭제할 수 없습니다." }, { status: 400 });
  }
  if (productCount > 0) {
    return NextResponse.json({ error: `등록된 상품이 ${productCount}개 있어 삭제할 수 없습니다.` }, { status: 400 });
  }

  try {
    await prisma.category.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ error: e.message || "삭제 실패" }, { status: 400 });
  }
}
