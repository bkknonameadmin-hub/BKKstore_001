import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [productCount, activeProductCount, outOfStockCount, orderCount, paidOrderCount, totalRevenue, recentOrders] = await Promise.all([
    prisma.product.count().catch(() => 0),
    prisma.product.count({ where: { isActive: true } }).catch(() => 0),
    prisma.product.count({ where: { stock: 0 } }).catch(() => 0),
    prisma.order.count().catch(() => 0),
    prisma.order.count({ where: { status: "PAID" } }).catch(() => 0),
    prisma.order.aggregate({ where: { status: "PAID" }, _sum: { totalAmount: true } }).catch(() => ({ _sum: { totalAmount: 0 } })),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { items: true } }).catch(() => []),
  ]);

  const cards = [
    { label: "전체 상품", value: productCount.toLocaleString(), sub: `판매중 ${activeProductCount}` , href: "/admin/products" },
    { label: "품절 상품", value: outOfStockCount.toLocaleString(), sub: "재고 0개", href: "/admin/products?stock=0", danger: outOfStockCount > 0 },
    { label: "전체 주문", value: orderCount.toLocaleString(), sub: `결제완료 ${paidOrderCount}`, href: "/admin/orders" },
    { label: "누적 매출", value: formatKRW(totalRevenue._sum.totalAmount || 0), sub: "결제완료 기준", href: "/admin/orders?status=PAID" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-xl font-bold">대시보드</h1>
        <Link href="/admin/products/new" className="btn-primary text-sm">+ 상품 등록</Link>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="bg-white rounded border border-gray-200 p-5 hover:border-brand-500 transition-colors">
            <div className="text-xs text-gray-500">{c.label}</div>
            <div className={`mt-2 text-2xl font-bold ${c.danger ? "text-red-500" : "text-gray-800"}`}>{c.value}</div>
            <div className="mt-1 text-[11px] text-gray-400">{c.sub}</div>
          </Link>
        ))}
      </div>

      {/* 최근 주문 */}
      <section className="bg-white rounded border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-bold">최근 주문</h2>
          <Link href="/admin/orders" className="text-sm text-gray-500 hover:text-brand-600">전체보기 →</Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">주문이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs">
              <tr>
                <th className="text-left px-4 py-2.5">주문번호</th>
                <th className="text-left px-4 py-2.5">받는분</th>
                <th className="text-left px-4 py-2.5">상품</th>
                <th className="text-right px-4 py-2.5">금액</th>
                <th className="text-center px-4 py-2.5">상태</th>
                <th className="text-right px-4 py-2.5">일시</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 font-mono text-xs">{o.orderNo}</td>
                  <td className="px-4 py-2.5">{o.recipient}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {o.items[0]?.name}{o.items.length > 1 && ` 외 ${o.items.length - 1}건`}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold">{formatKRW(o.totalAmount)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="px-2 py-0.5 rounded text-xs bg-brand-50 text-brand-700">{o.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500 text-xs">
                    {o.createdAt.toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
