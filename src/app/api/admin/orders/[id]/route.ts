import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdminApi } from "@/lib/admin-guard";
import { NEXT_TRANSITIONS } from "@/lib/order-status";
import type { OrderStatus, Prisma } from "@prisma/client";

const Schema = z.object({
  status: z.enum(["PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).optional(),
  courier: z.string().nullable().optional(),
  trackingNo: z.string().nullable().optional(),
  adminMemo: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const body = Schema.parse(await req.json());
    const order = await prisma.order.findUnique({ where: { id: params.id }, include: { items: true } });
    if (!order) return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });

    const update: Prisma.OrderUpdateInput = {};

    // 상태 변경: 전이 규칙 검증
    if (body.status && body.status !== order.status) {
      const allowed = NEXT_TRANSITIONS[order.status];
      if (!allowed.includes(body.status as OrderStatus)) {
        return NextResponse.json(
          { error: `${order.status} 에서 ${body.status} 로 변경할 수 없습니다.` },
          { status: 400 }
        );
      }
      update.status = body.status;

      const now = new Date();
      if (body.status === "SHIPPED") {
        if (!body.trackingNo?.trim()) return NextResponse.json({ error: "송장번호가 필요합니다." }, { status: 400 });
        update.shippedAt = now;
        update.courier = body.courier || null;
        update.trackingNo = body.trackingNo.trim();
      } else if (body.status === "DELIVERED") {
        update.deliveredAt = now;
      } else if (body.status === "CANCELLED" || body.status === "REFUNDED") {
        update.cancelledAt = now;
      }
    }

    if (body.courier !== undefined && update.status !== "SHIPPED") update.courier = body.courier;
    if (body.trackingNo !== undefined && update.status !== "SHIPPED") update.trackingNo = body.trackingNo;
    if (body.adminMemo !== undefined) update.adminMemo = body.adminMemo;

    // CANCELLED / REFUNDED 시 재고 복원 (이미 PAID 이후였다면)
    const restock = body.status && (body.status === "CANCELLED" || body.status === "REFUNDED")
      && (order.status === "PAID" || order.status === "PREPARING" || order.status === "SHIPPED" || order.status === "DELIVERED");

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.order.update({ where: { id: order.id }, data: update });
      if (restock) {
        // 옵션이 있는 항목은 옵션 재고를, 없으면 상품 재고를 복원
        for (const it of order.items) {
          if (it.variantId) {
            await tx.productVariant.update({
              where: { id: it.variantId },
              data: { stock: { increment: it.quantity } },
            });
          } else {
            await tx.product.update({
              where: { id: it.productId },
              data: { stock: { increment: it.quantity } },
            });
          }
        }

        // 사용한 적립금 환불
        if (order.userId && order.pointUsed > 0) {
          await tx.user.update({
            where: { id: order.userId },
            data: { pointBalance: { increment: order.pointUsed } },
          });
          await tx.pointHistory.create({
            data: {
              userId: order.userId,
              amount: order.pointUsed,
              reason: `주문 ${body.status === "CANCELLED" ? "취소" : "환불"} 적립금 환불`,
              orderId: order.id,
            },
          });
        }

        // 적립된 적립금 회수 (이미 적립한 경우)
        if (order.userId && order.pointEarned > 0) {
          await tx.user.update({
            where: { id: order.userId },
            data: { pointBalance: { decrement: order.pointEarned } },
          });
          await tx.pointHistory.create({
            data: {
              userId: order.userId,
              amount: -order.pointEarned,
              reason: `주문 ${body.status === "CANCELLED" ? "취소" : "환불"} 적립금 회수`,
              orderId: order.id,
            },
          });
        }

        // 사용한 쿠폰 복원 (재사용 가능하게)
        if (order.couponId && order.userId) {
          await tx.userCoupon.updateMany({
            where: { userId: order.userId, couponId: order.couponId, orderId: order.id },
            data: { usedAt: null, orderId: null },
          });
          await tx.coupon.update({
            where: { id: order.couponId },
            data: { usedCount: { decrement: 1 } },
          });
        }
      }
      return u;
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "수정 실패" }, { status: 400 });
  }
}
