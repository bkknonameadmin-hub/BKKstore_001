/**
 * 현금영수증 발행 (토스페이먼츠 기반)
 * https://docs.tosspayments.com/reference#현금영수증
 *
 * - 가상계좌 / 계좌이체 / 휴대폰결제 등 현금성 결제 → 발행 의무
 * - 카드 결제는 매출전표가 영수증을 대체하므로 발행 불필요
 *
 * 미설정시 콘솔 폴백 (개발 모드)
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type CashReceiptType = "PERSONAL" | "BUSINESS";

export type IssueArgs = {
  orderId: string;
  type: CashReceiptType;
  /** 개인: 휴대폰 번호 / 사업자: 사업자등록번호 */
  registrationNumber: string;
};

export async function issueCashReceipt(args: IssueArgs): Promise<{ ok: boolean; error?: string }> {
  const order = await prisma.order.findUnique({ where: { id: args.orderId } });
  if (!order) return { ok: false, error: "주문 없음" };
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return { ok: false, error: "취소/환불된 주문은 발행할 수 없습니다." };
  }
  if (order.cashReceiptIssued) {
    return { ok: false, error: "이미 발행된 주문입니다." };
  }
  if (order.provider !== "TOSS") {
    // 다른 PG는 별도 구현 필요
    return { ok: false, error: `${order.provider} 결제는 별도 처리가 필요합니다.` };
  }

  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey || !order.providerTxnId) {
    logger.warn("cash-receipt.dev_mode", { orderId: order.id });
    // 개발 모드: DB만 갱신
    await prisma.order.update({
      where: { id: order.id },
      data: {
        cashReceiptType: args.type,
        cashReceiptNumber: args.registrationNumber.replace(/[^0-9]/g, ""),
        cashReceiptIssued: true,
      },
    });
    return { ok: true };
  }

  try {
    const basicAuth = Buffer.from(secretKey + ":").toString("base64");
    const res = await fetch(`https://api.tosspayments.com/v1/cash-receipts`, {
      method: "POST",
      headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: order.totalAmount,
        orderId: order.orderNo,
        orderName: `주문 ${order.orderNo}`,
        customerIdentityNumber: args.registrationNumber.replace(/[^0-9]/g, ""),
        type: args.type === "BUSINESS" ? "사업자증빙용" : "소득공제",
        businessNumber: process.env.BUSINESS_REGISTRATION_NUMBER || "",
      }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.message || "발행 실패" };

    await prisma.order.update({
      where: { id: order.id },
      data: {
        cashReceiptType: args.type,
        cashReceiptNumber: args.registrationNumber.replace(/[^0-9]/g, ""),
        cashReceiptIssued: true,
      },
    });

    logger.info("cash-receipt.issued", { orderId: order.id, type: args.type });
    return { ok: true };
  } catch (e: any) {
    logger.error("cash-receipt.failed", { error: e.message });
    return { ok: false, error: e.message };
  }
}
