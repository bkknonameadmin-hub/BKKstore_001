import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const inputSchema = z.object({
  productId: z.string(),
  variantId: z.string().nullable().optional(),
});

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id as string | undefined;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const items = await prisma.stockNotification.findMany({
    where: { userId, notifiedAt: null },
    select: { productId: true, variantId: true },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "잘못된 입력" }, { status: 400 });

  const { productId, variantId } = parsed.data;

  // 상품 존재 여부 확인
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });

  // Prisma 의 composite unique 는 nullable 컬럼이 포함되면 타입상 null 불가 → findFirst + create/update
  const existing = await prisma.stockNotification.findFirst({
    where: { userId, productId, variantId: variantId ?? null },
  });
  if (existing) {
    await prisma.stockNotification.update({
      where: { id: existing.id },
      data: { notifiedAt: null },
    });
  } else {
    await prisma.stockNotification.create({
      data: { userId, productId, variantId: variantId ?? null },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const productId = sp.get("productId");
  const variantId = sp.get("variantId");
  if (!productId) return NextResponse.json({ error: "productId 가 필요합니다." }, { status: 400 });

  await prisma.stockNotification.deleteMany({
    where: { userId, productId, variantId: variantId || null },
  });
  return NextResponse.json({ ok: true });
}
