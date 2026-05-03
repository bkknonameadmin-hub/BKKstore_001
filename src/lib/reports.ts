import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";

/**
 * 매출 정산 리포트용 집계 헬퍼
 *
 * "정산 매출" 정의:
 *   - 결제완료 이상(PAID/PREPARING/SHIPPED/DELIVERED/PARTIALLY_REFUNDED) 주문의
 *     totalAmount 합계 - refundedAmount 합계
 *   - CANCELLED, REFUNDED 주문은 매출에서 제외
 */

const REVENUE_STATUSES: OrderStatus[] = [
  "PAID", "PREPARING", "SHIPPED", "DELIVERED", "PARTIALLY_REFUNDED",
];

export type DateRange = { from: Date; to: Date };

/** YYYY-MM → 해당 월의 시작/종료 Date 범위 */
export function monthRange(yearMonth: string): DateRange {
  const [y, m] = yearMonth.split("-").map(Number);
  const from = new Date(y, m - 1, 1, 0, 0, 0);
  const to = new Date(y, m, 0, 23, 59, 59, 999);
  return { from, to };
}

/** 현재 시점 기준 YYYY-MM */
export function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type SummaryBlock = {
  range: { from: string; to: string };
  totals: {
    grossRevenue: number;     // 결제완료 이상 totalAmount 합
    refundedAmount: number;   // refundedAmount 합 (부분환불 + 전체환불)
    netRevenue: number;       // gross - refunded
    orderCount: number;       // 주문수 (결제완료 이상)
    refundedOrderCount: number; // 전체 취소/환불된 주문수
    averageOrderValue: number;  // gross / count
    couponDiscount: number;
    pointUsed: number;
    pointEarned: number;
    shippingFee: number;
  };
};

export type DailyRow = {
  date: string;
  orderCount: number;
  grossRevenue: number;
  refundedAmount: number;
  netRevenue: number;
  couponDiscount: number;
  pointUsed: number;
  shippingFee: number;
};

export type ProductRow = {
  productId: string;
  sku: string;
  name: string;
  brand: string | null;
  category: string;
  quantity: number;
  amount: number;
};

export type ProviderRow = {
  provider: string;
  orderCount: number;
  amount: number;
};

export type CategoryRow = {
  categoryId: string;
  name: string;
  orderItemCount: number;
  amount: number;
};

export async function getSummary(range: DateRange): Promise<SummaryBlock> {
  const [agg, refundAgg, refundedOrderCount] = await Promise.all([
    prisma.order.aggregate({
      where: {
        status: { in: REVENUE_STATUSES },
        paidAt: { gte: range.from, lte: range.to },
      },
      _sum: {
        totalAmount: true,
        refundedAmount: true,
        couponDiscount: true,
        pointUsed: true,
        pointEarned: true,
        shippingFee: true,
      },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: ["CANCELLED", "REFUNDED"] },
        paidAt: { gte: range.from, lte: range.to },
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.order.count({
      where: {
        status: { in: ["CANCELLED", "REFUNDED"] },
        paidAt: { gte: range.from, lte: range.to },
      },
    }),
  ]);

  const gross = agg._sum.totalAmount || 0;
  const refunded = (agg._sum.refundedAmount || 0) + (refundAgg._sum.totalAmount || 0);
  const orderCount = agg._count._all || 0;

  return {
    range: { from: fmtDate(range.from), to: fmtDate(range.to) },
    totals: {
      grossRevenue: gross,
      refundedAmount: refunded,
      netRevenue: Math.max(0, gross - refunded),
      orderCount,
      refundedOrderCount,
      averageOrderValue: orderCount > 0 ? Math.round(gross / orderCount) : 0,
      couponDiscount: agg._sum.couponDiscount || 0,
      pointUsed: agg._sum.pointUsed || 0,
      pointEarned: agg._sum.pointEarned || 0,
      shippingFee: agg._sum.shippingFee || 0,
    },
  };
}

export async function getDaily(range: DateRange): Promise<DailyRow[]> {
  // SQL groupBy by date — Prisma 는 date 그룹핑 미지원 → raw query
  const rows = await prisma.$queryRaw<Array<{
    d: Date; orders: bigint; gross: bigint | null; refunded: bigint | null;
    coupon: bigint | null; points: bigint | null; shipping: bigint | null;
  }>>`
    SELECT
      DATE(o."paidAt") AS d,
      COUNT(*)::bigint AS orders,
      COALESCE(SUM(o."totalAmount"), 0)::bigint AS gross,
      COALESCE(SUM(o."refundedAmount"), 0)::bigint AS refunded,
      COALESCE(SUM(o."couponDiscount"), 0)::bigint AS coupon,
      COALESCE(SUM(o."pointUsed"), 0)::bigint AS points,
      COALESCE(SUM(o."shippingFee"), 0)::bigint AS shipping
    FROM "Order" o
    WHERE o."paidAt" >= ${range.from}
      AND o."paidAt" <= ${range.to}
      AND o."status"::text IN ('PAID','PREPARING','SHIPPED','DELIVERED','PARTIALLY_REFUNDED')
    GROUP BY DATE(o."paidAt")
    ORDER BY d ASC
  `;

  // 빈 날짜 채우기 (0 으로)
  const map = new Map(rows.map((r) => [fmtDate(r.d), r]));
  const out: DailyRow[] = [];
  for (let d = new Date(range.from); d <= range.to; d.setDate(d.getDate() + 1)) {
    const key = fmtDate(d);
    const r = map.get(key);
    out.push({
      date: key,
      orderCount: Number(r?.orders || 0),
      grossRevenue: Number(r?.gross || 0),
      refundedAmount: Number(r?.refunded || 0),
      netRevenue: Number(r?.gross || 0) - Number(r?.refunded || 0),
      couponDiscount: Number(r?.coupon || 0),
      pointUsed: Number(r?.points || 0),
      shippingFee: Number(r?.shipping || 0),
    });
  }
  return out;
}

export async function getProviderBreakdown(range: DateRange): Promise<ProviderRow[]> {
  const groups = await prisma.order.groupBy({
    by: ["provider"],
    where: {
      status: { in: REVENUE_STATUSES },
      paidAt: { gte: range.from, lte: range.to },
    },
    _sum: { totalAmount: true },
    _count: { _all: true },
  });
  return groups.map((g) => ({
    provider: g.provider || "-",
    orderCount: g._count._all,
    amount: g._sum.totalAmount || 0,
  })).sort((a, b) => b.amount - a.amount);
}

export async function getTopProducts(range: DateRange, limit = 100): Promise<ProductRow[]> {
  const rows = await prisma.$queryRaw<Array<{
    product_id: string; quantity: bigint; amount: bigint;
  }>>`
    SELECT oi."productId" AS product_id,
           SUM(oi.quantity - oi."refundedQuantity")::bigint AS quantity,
           SUM((oi.quantity - oi."refundedQuantity") * oi.price)::bigint AS amount
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE o."paidAt" >= ${range.from}
      AND o."paidAt" <= ${range.to}
      AND o."status"::text IN ('PAID','PREPARING','SHIPPED','DELIVERED','PARTIALLY_REFUNDED')
    GROUP BY oi."productId"
    HAVING SUM(oi.quantity - oi."refundedQuantity") > 0
    ORDER BY amount DESC
    LIMIT ${limit}
  `;
  if (rows.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: rows.map((r) => r.product_id) } },
    include: { category: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  return rows.map((r) => {
    const p = byId.get(r.product_id);
    return {
      productId: r.product_id,
      sku: p?.sku || "-",
      name: p?.name || "(삭제됨)",
      brand: p?.brand || null,
      category: p?.category?.name || "-",
      quantity: Number(r.quantity),
      amount: Number(r.amount),
    };
  });
}

export async function getCategoryBreakdown(range: DateRange): Promise<CategoryRow[]> {
  const rows = await prisma.$queryRaw<Array<{
    cat_id: string; name: string; cnt: bigint; amount: bigint;
  }>>`
    SELECT c.id AS cat_id, c.name AS name,
           SUM(oi.quantity - oi."refundedQuantity")::bigint AS cnt,
           SUM((oi.quantity - oi."refundedQuantity") * oi.price)::bigint AS amount
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    JOIN "Product" p ON p.id = oi."productId"
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE o."paidAt" >= ${range.from}
      AND o."paidAt" <= ${range.to}
      AND o."status"::text IN ('PAID','PREPARING','SHIPPED','DELIVERED','PARTIALLY_REFUNDED')
    GROUP BY c.id, c.name
    HAVING SUM(oi.quantity - oi."refundedQuantity") > 0
    ORDER BY amount DESC
  `;
  return rows.map((r) => ({
    categoryId: r.cat_id,
    name: r.name,
    orderItemCount: Number(r.cnt),
    amount: Number(r.amount),
  }));
}

/** 엑셀 시트2(주문 상세) 용 - 결제완료 이상 주문 전체 */
export async function getOrdersDetail(range: DateRange) {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: REVENUE_STATUSES },
      paidAt: { gte: range.from, lte: range.to },
    },
    orderBy: { paidAt: "asc" },
    include: {
      items: { include: { product: { select: { name: true, sku: true, category: { select: { name: true } } } } } },
      user: { select: { email: true, name: true } },
    },
    take: 50_000,
  });

  type Row = {
    paidAt: string; orderNo: string; status: string;
    customerName: string; customerEmail: string;
    productName: string; sku: string; category: string;
    variantName: string;
    quantity: number; unitPrice: number; itemTotal: number;
    couponDiscount: number; pointUsed: number; shippingFee: number;
    refundedAmount: number;
    provider: string; providerTxnId: string;
  };

  const rows: Row[] = [];
  for (const o of orders) {
    for (const it of o.items) {
      rows.push({
        paidAt: o.paidAt ? o.paidAt.toISOString().slice(0, 19).replace("T", " ") : "",
        orderNo: o.orderNo,
        status: o.status,
        customerName: o.user?.name || o.recipient,
        customerEmail: o.user?.email || "(비회원)",
        productName: it.product?.name || it.name,
        sku: it.product?.sku || "-",
        category: it.product?.category?.name || "-",
        variantName: it.variantName || "",
        quantity: it.quantity,
        unitPrice: it.price,
        itemTotal: it.price * it.quantity,
        couponDiscount: o.couponDiscount,
        pointUsed: o.pointUsed,
        shippingFee: o.shippingFee,
        refundedAmount: o.refundedAmount,
        provider: o.provider || "",
        providerTxnId: o.providerTxnId || "",
      });
    }
  }
  return rows;
}
