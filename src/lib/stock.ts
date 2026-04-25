import { prisma } from "@/lib/prisma";
import { getLowStockThreshold, notifyAdmin } from "@/lib/notify";

/**
 * 주문 결제 완료 시 호출.
 * 1) 트랜잭션으로 재고 차감 + 주문 상태 PAID 처리
 * 2) 차감 후 임계치 이하로 떨어진 상품이 있으면 비동기로 알림 발송 (실패해도 결제는 완료)
 */
export async function finalizeOrderPayment(args: {
  orderId: string;
  providerTxnId: string;
}): Promise<void> {
  const { orderId, providerTxnId } = args;

  const items = await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: "PAID", providerTxnId, paidAt: new Date() },
    });
    const its = await tx.orderItem.findMany({ where: { orderId } });
    for (const it of its) {
      await tx.product.update({
        where: { id: it.productId },
        data: { stock: { decrement: it.quantity } },
      });
    }
    return its;
  });

  // 트랜잭션 커밋 후 임계치 체크 (실패해도 결제 흐름 영향 없음)
  void checkAndNotifyLowStock(items.map((i) => i.productId)).catch(() => {});
}

async function checkAndNotifyLowStock(productIds: string[]) {
  if (productIds.length === 0) return;
  const threshold = getLowStockThreshold();

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true },
  });

  const triggered = products.filter((p) => p.stock <= (p.lowStockThreshold ?? threshold));
  if (triggered.length === 0) return;

  const lines = triggered.map((p) => `- ${p.name} (SKU ${p.sku}) — 잔여 ${p.stock}개`);
  const text = `결제 완료 후 재고 임계치 도달:\n\n${lines.join("\n")}`;
  const html = `
    <div style="font-family: sans-serif; font-size: 14px;">
      <h2>⚠️ 재고 임계치 도달</h2>
      <p>방금 결제 완료된 주문으로 인해 다음 ${triggered.length}건의 상품이 임계치(${threshold}) 이하로 떨어졌습니다.</p>
      <ul>${triggered.map((p) => `<li>${p.name} (SKU ${p.sku}) — 잔여 ${p.stock}개</li>`).join("")}</ul>
    </div>
  `;

  await notifyAdmin({
    subject: `[낚시몰] 재고 임계치 도달 (${triggered.length}건)`,
    html, text,
  });
}
