import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 반품/교환 신청 (회원용)
 *
 * POST /api/returns
 * body: {
 *   orderId, type: "RETURN" | "EXCHANGE",
 *   reason, reasonDetail?,
 *   items: [{ orderItemId, quantity }]
 * }
 *
 * 정책:
 *  - DELIVERED 후 7일 이내만 신청 가능
 *  - 단순 변심: 배송비 본인 부담
 *  - 상품 하자/오배송: 무료
 */

const Schema = z.object({
  orderId: z.string(),
  type: z.enum(["RETURN", "EXCHANGE"]),
  reason: z.string().min(1).max(500),
  reasonDetail: z.string().max(1000).optional(),
  items: z.array(z.object({
    orderItemId: z.string(),
    quantity: z.number().int().min(1),
  })).min(1),
});

const RETURN_WINDOW_DAYS = 7;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const userId = (session.user as any).id as string;

  try {
    const data = Schema.parse(await req.json());

    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { items: true },
    });
    if (!order) return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    if (order.userId !== userId) return NextResponse.json({ error: "본인 주문이 아닙니다." }, { status: 403 });
    if (order.status !== "DELIVERED") {
      return NextResponse.json({ error: "배송 완료된 주문만 반품/교환 신청할 수 있습니다." }, { status: 400 });
    }
    if (order.deliveredAt) {
      const daysSince = (Date.now() - order.deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > RETURN_WINDOW_DAYS) {
        return NextResponse.json({ error: `반품/교환 신청 기간(${RETURN_WINDOW_DAYS}일)이 지났습니다.` }, { status: 400 });
      }
    }

    // 이미 신청 중인 항목이 있는지 체크
    const existing = await prisma.returnRequest.findFirst({
      where: {
        orderId: order.id,
        status: { in: ["REQUESTED", "APPROVED", "PICKED_UP"] },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "이미 처리 중인 반품/교환 요청이 있습니다." }, { status: 409 });
    }

    // 각 orderItem 수량 검증
    let refundAmount = 0;
    for (const it of data.items) {
      const oi = order.items.find((x) => x.id === it.orderItemId);
      if (!oi) return NextResponse.json({ error: `주문상품을 찾을 수 없습니다.` }, { status: 400 });
      const remaining = oi.quantity - oi.refundedQuantity;
      if (it.quantity > remaining) {
        return NextResponse.json({
          error: `${oi.name} - 환불 가능 수량 초과 (남은 수량: ${remaining})`,
        }, { status: 400 });
      }
      refundAmount += oi.price * it.quantity;
    }

    const created = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        userId,
        type: data.type,
        status: "REQUESTED",
        reason: data.reason,
        reasonDetail: data.reasonDetail || null,
        refundAmount,
        items: {
          create: data.items.map((it) => ({
            orderItemId: it.orderItemId,
            quantity: it.quantity,
          })),
        },
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "신청 실패" }, { status: 400 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const userId = (session.user as any).id as string;

  const list = await prisma.returnRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      order: { select: { orderNo: true } },
      items: { include: { orderItem: { select: { name: true, variantName: true, price: true } } } },
    },
  });
  return NextResponse.json(list);
}
