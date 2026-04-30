import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  productId: z.string(),
  orderItemId: z.string(),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(5).max(2000),
  images: z.array(z.string()).max(5).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId 필요" }, { status: 400 });

  const reviews = await prisma.review.findMany({
    where: { productId, isHidden: false },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  // 이메일은 마스킹
  const masked = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    content: r.content,
    images: r.images,
    isVerifiedPurchase: r.isVerifiedPurchase,
    createdAt: r.createdAt,
    authorName: maskName(r.user.name),
  }));
  return NextResponse.json(masked);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const userId = (session.user as any).id as string;

  try {
    const data = CreateSchema.parse(await req.json());

    // 구매 인증: 해당 orderItem 이 본인의 PAID 이상 주문에 속해야 하고, productId 일치 필요
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: data.orderItemId },
      include: { order: true },
    });
    if (!orderItem || orderItem.productId !== data.productId) {
      return NextResponse.json({ error: "구매 이력을 확인할 수 없습니다." }, { status: 400 });
    }
    if (orderItem.order.userId !== userId) {
      return NextResponse.json({ error: "본인의 주문이 아닙니다." }, { status: 403 });
    }
    const okStatus = ["PAID", "PREPARING", "SHIPPED", "DELIVERED"];
    if (!okStatus.includes(orderItem.order.status)) {
      return NextResponse.json({ error: "결제완료 후 작성할 수 있습니다." }, { status: 400 });
    }

    // 동일 orderItem에 대해 중복 작성 금지
    const exists = await prisma.review.findUnique({ where: { orderItemId: data.orderItemId } });
    if (exists) return NextResponse.json({ error: "이미 작성한 리뷰입니다." }, { status: 409 });

    const review = await prisma.review.create({
      data: {
        userId,
        productId: data.productId,
        orderItemId: data.orderItemId,
        rating: data.rating,
        content: data.content,
        images: data.images || [],
        isVerifiedPurchase: true,
      },
    });

    return NextResponse.json({ ok: true, id: review.id });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "리뷰 작성 실패" }, { status: 400 });
  }
}

function maskName(name: string): string {
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}
