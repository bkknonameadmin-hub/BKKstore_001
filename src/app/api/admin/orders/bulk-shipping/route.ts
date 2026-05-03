import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdminApi } from "@/lib/admin-guard";
import { notifyShippingStarted } from "@/lib/alimtalk";

/**
 * 송장 일괄 처리
 * POST /api/admin/orders/bulk-shipping
 * Body: { rows: [{ orderNo, courier, trackingNo }] }
 *
 * - PAID/PREPARING 상태만 SHIPPED 로 전환
 * - shippedAt 자동 기록
 * - 알림톡 자동 발송 (큐 enqueue)
 */

const RowSchema = z.object({
  orderNo: z.string().min(1),
  courier: z.string().min(1),
  trackingNo: z.string().min(1),
});

const Schema = z.object({ rows: z.array(RowSchema).min(1).max(500) });

export async function POST(req: NextRequest) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { rows } = Schema.parse(await req.json());

    let updated = 0, skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const order = await prisma.order.findUnique({
          where: { orderNo: row.orderNo },
          select: { id: true, orderNo: true, status: true, recipient: true, phone: true, totalAmount: true },
        });
        if (!order) {
          errors.push(`${row.orderNo}: 주문 없음`);
          skipped++;
          continue;
        }
        if (!["PAID", "PREPARING"].includes(order.status)) {
          errors.push(`${row.orderNo}: 발송 가능 상태 아님 (${order.status})`);
          skipped++;
          continue;
        }

        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "SHIPPED",
            courier: row.courier,
            trackingNo: row.trackingNo,
            shippedAt: new Date(),
          },
        });

        // 알림톡 비동기 발송 (실패해도 영향 없음)
        void notifyShippingStarted({
          orderNo: order.orderNo,
          recipient: order.recipient,
          phone: order.phone,
          totalAmount: order.totalAmount,
          courier: row.courier,
          trackingNo: row.trackingNo,
        }).catch(() => {});

        updated++;
      } catch (e: any) {
        errors.push(`${row.orderNo}: ${e.message}`);
        skipped++;
      }
    }

    return NextResponse.json({ ok: true, updated, skipped, errors });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
