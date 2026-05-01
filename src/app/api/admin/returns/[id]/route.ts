import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdminApi } from "@/lib/admin-guard";
import { logger } from "@/lib/logger";

/**
 * 반품/교환 요청 처리 (관리자)
 *
 * 상태 전환:
 *   REQUESTED → APPROVED (관리자 승인 + 회수 라벨 입력)
 *   APPROVED → PICKED_UP (회수 완료)
 *   PICKED_UP → COMPLETED (검수 후 환불/교환 완료)
 *   REQUESTED/APPROVED → REJECTED
 */

const Schema = z.object({
  status: z.enum(["APPROVED", "PICKED_UP", "COMPLETED", "REJECTED"]),
  pickupCourier: z.string().nullable().optional(),
  pickupTrackingNo: z.string().nullable().optional(),
  adminMemo: z.string().max(500).optional(),
});

const ALLOWED_TRANSITION: Record<string, string[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED:  ["PICKED_UP", "REJECTED"],
  PICKED_UP: ["COMPLETED", "REJECTED"],
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const data = Schema.parse(await req.json());

    const rr = await prisma.returnRequest.findUnique({
      where: { id: params.id },
      include: { items: { include: { orderItem: true } }, order: true },
    });
    if (!rr) return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });

    const allowed = ALLOWED_TRANSITION[rr.status] || [];
    if (!allowed.includes(data.status)) {
      return NextResponse.json({ error: `${rr.status} → ${data.status} 전환은 허용되지 않습니다.` }, { status: 400 });
    }

    if (data.status === "APPROVED" && !data.pickupTrackingNo) {
      return NextResponse.json({ error: "회수 송장번호를 입력해주세요." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: data.status,
        adminMemo: data.adminMemo ?? rr.adminMemo,
      };
      if (data.pickupCourier !== undefined) updateData.pickupCourier = data.pickupCourier;
      if (data.pickupTrackingNo !== undefined) updateData.pickupTrackingNo = data.pickupTrackingNo;

      await tx.returnRequest.update({ where: { id: rr.id }, data: updateData });

      // COMPLETED: 환불 + 재고 복원 (RETURN 만, EXCHANGE 는 별도 발송)
      if (data.status === "COMPLETED" && rr.type === "RETURN") {
        // 1) 각 아이템의 refundedQuantity 증가 + 재고 복원
        for (const it of rr.items) {
          await tx.orderItem.update({
            where: { id: it.orderItemId },
            data: { refundedQuantity: { increment: it.quantity } },
          });
          if (it.orderItem.variantId) {
            await tx.productVariant.update({
              where: { id: it.orderItem.variantId },
              data: { stock: { increment: it.quantity } },
            });
          } else {
            await tx.product.update({
              where: { id: it.orderItem.productId },
              data: { stock: { increment: it.quantity } },
            });
          }
        }

        // 2) 환불 금액 누적
        await tx.order.update({
          where: { id: rr.orderId },
          data: {
            refundedAmount: { increment: rr.refundAmount },
            // 전체 환불되었는지 체크
            status: rr.refundAmount + rr.order.refundedAmount >= rr.order.totalAmount
              ? "REFUNDED"
              : "PARTIALLY_REFUNDED",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: guard.session?.user?.id || null,
          actorEmail: guard.session?.user?.email || null,
          action: `return.${data.status.toLowerCase()}`,
          targetType: "ReturnRequest",
          targetId: rr.id,
          metadata: { orderId: rr.orderId, type: rr.type, refundAmount: rr.refundAmount },
        },
      });
    });

    logger.info("admin.return.transition", {
      id: rr.id, from: rr.status, to: data.status,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "처리 실패" }, { status: 400 });
  }
}
