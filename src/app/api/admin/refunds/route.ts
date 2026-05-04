import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdminApi } from "@/lib/admin-guard";
import { logger } from "@/lib/logger";
import { cancelByProvider } from "@/lib/payments/refund";
import { checkIdempotency, saveIdempotency } from "@/lib/idempotency";

/**
 * 환불 처리 (전액/부분 모두 지원)
 *
 * POST /api/admin/refunds
 * body: { orderId, amount, reason, refundPoint?: boolean, refundCoupon?: boolean }
 *
 * - amount=전체이면 status=REFUNDED, 부분이면 PARTIALLY_REFUNDED
 * - 적립금 사용분 복구 (옵션)
 * - 쿠폰 복구 (옵션)
 * - PG 실제 환불은 PG SDK로 별도 호출 필요 (TODO 표시)
 */

const Schema = z.object({
  orderId: z.string(),
  amount: z.number().int().positive(),
  reason: z.string().max(500),
  refundPoint: z.boolean().default(true),
  refundCoupon: z.boolean().default(false),
  adminMemo: z.string().max(500).optional(),
  /** PG 호출 없이 DB만 갱신 (이미 PG에서 환불된 경우 등 — 신중하게 사용) */
  skipPgCall: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const replay = await checkIdempotency(req, "admin.refunds.create", guard.session?.user?.id || null);
    if (replay) return replay;

    const data = Schema.parse(await req.json());
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { items: true },
    });
    if (!order) return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });

    const refundable = ["PAID", "PREPARING", "SHIPPED", "DELIVERED", "PARTIALLY_REFUNDED"];
    if (!refundable.includes(order.status)) {
      return NextResponse.json({ error: `현재 상태(${order.status})에서는 환불할 수 없습니다.` }, { status: 400 });
    }

    const remainingRefundable = order.totalAmount - order.refundedAmount;
    if (data.amount > remainingRefundable) {
      return NextResponse.json({
        error: `환불 가능 금액 초과 (남은 환불액: ${remainingRefundable.toLocaleString()}원)`,
      }, { status: 400 });
    }

    const isFullRefund = data.amount + order.refundedAmount === order.totalAmount;

    // PG 실제 환불 호출 (DB 변경 전에 수행 — 실패시 DB 롤백 없이 사고 방지)
    if (!data.skipPgCall) {
      if (!order.providerTxnId || !order.provider) {
        return NextResponse.json({
          error: "결제 정보가 없어 PG 환불을 호출할 수 없습니다. (관리자: skipPgCall 사용 신중히 검토)",
        }, { status: 400 });
      }
      const pgResult = await cancelByProvider({
        provider: order.provider,
        providerTxnId: order.providerTxnId,
        reason: data.reason,
        amount: data.amount,
      });
      if (!pgResult.ok) {
        logger.error("admin.refund.pg_failed", {
          orderId: order.id,
          provider: order.provider,
          error: pgResult.error,
        });
        return NextResponse.json({
          error: `PG 환불 실패: ${pgResult.error}`,
        }, { status: 502 });
      }
      logger.info("admin.refund.pg_ok", { orderId: order.id, amount: data.amount, provider: order.provider });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) RefundRequest 생성
      const refund = await tx.refundRequest.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          amount: data.amount,
          reason: data.reason,
          status: "COMPLETED",
          adminMemo: data.adminMemo || null,
          processedAt: new Date(),
        },
      });

      // 2) 주문 상태 + 누적 환불액
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
          refundedAmount: { increment: data.amount },
          cancelledAt: isFullRefund ? new Date() : order.cancelledAt,
          adminMemo: data.adminMemo || order.adminMemo,
        },
      });

      // 3) 적립금 복구
      if (data.refundPoint && order.userId && order.pointUsed > 0 && isFullRefund) {
        await tx.user.update({
          where: { id: order.userId },
          data: { pointBalance: { increment: order.pointUsed } },
        });
        await tx.pointHistory.create({
          data: {
            userId: order.userId,
            amount: order.pointUsed,
            reason: "환불 적립금 복구",
            orderId: order.id,
          },
        });
      }

      // 적립된 적립금은 회수 (전액 환불시)
      if (isFullRefund && order.userId && order.pointEarned > 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: { pointBalance: { decrement: order.pointEarned } },
        });
        await tx.pointHistory.create({
          data: {
            userId: order.userId,
            amount: -order.pointEarned,
            reason: "환불로 적립금 회수",
            orderId: order.id,
          },
        });
      }

      // 4) 쿠폰 복구 (전액 환불 + refundCoupon=true 일 때만)
      if (data.refundCoupon && isFullRefund && order.couponId && order.userId) {
        await tx.userCoupon.updateMany({
          where: { userId: order.userId, orderId: order.id },
          data: { usedAt: null, orderId: null },
        });
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usedCount: { decrement: 1 } },
        });
      }

      // 5) 재고 복원 (전액 환불시만)
      if (isFullRefund) {
        for (const it of order.items) {
          const remaining = it.quantity - it.refundedQuantity;
          if (remaining <= 0) continue;
          if (it.variantId) {
            await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: remaining } } });
          } else {
            await tx.product.update({ where: { id: it.productId }, data: { stock: { increment: remaining } } });
          }
          await tx.orderItem.update({
            where: { id: it.id },
            data: { refundedQuantity: it.quantity },
          });
        }
      }

      // 6) 감사 로그
      await tx.auditLog.create({
        data: {
          actorId: guard.session?.user?.id || null,
          actorEmail: guard.session?.user?.email || null,
          action: isFullRefund ? "order.refund.full" : "order.refund.partial",
          targetType: "Order",
          targetId: order.id,
          metadata: { amount: data.amount, reason: data.reason },
        },
      });

      return refund;
    });

    logger.info("admin.refund.completed", {
      orderId: order.id, amount: data.amount, isFullRefund,
      actor: guard.session?.user?.email,
    });

    const responseBody = {
      ok: true,
      refundId: result.id,
      isFullRefund,
      message: isFullRefund ? "전액 환불 처리되었습니다." : "부분 환불 처리되었습니다.",
      pgCalled: !data.skipPgCall,
    };
    await saveIdempotency(req, "admin.refunds.create", guard.session?.user?.id || null, 200, responseBody);
    return NextResponse.json(responseBody);
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    logger.error("admin.refund.failed", { error: e.message });
    return NextResponse.json({ error: e.message || "환불 실패" }, { status: 400 });
  }
}
