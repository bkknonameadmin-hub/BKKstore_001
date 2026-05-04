import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/utils";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/order-status";
import OrderActionButtons from "./OrderActionButtons";

export const dynamic = "force-dynamic";
export const metadata = { title: "주문 내역" };

export default async function MyOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/mypage/orders");

  const userId = (session.user as any).id as string;
  const orders = await prisma.order
    .findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
      take: 50,
    })
    .catch(() => []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">주문 내역</h1>
        <Link href="/mypage" className="text-xs text-gray-500 hover:text-brand-600">← 마이페이지</Link>
      </div>

      {orders.length === 0 ? (
        <div className="py-16 text-center text-gray-500 border border-dashed border-gray-200 rounded">
          <div className="text-4xl mb-2">📭</div>
          <p>주문 내역이 없습니다.</p>
          <Link href="/products" className="btn-outline mt-4 inline-flex">상품 보러가기</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const reviewable = ["DELIVERED"].includes(o.status);
            return (
              <div key={o.id} className="border border-gray-200 rounded p-4 bg-white">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-mono text-gray-700">{o.orderNo}</span>
                    <span className="ml-3 text-gray-400">{o.createdAt.toLocaleDateString("ko-KR")}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ORDER_STATUS_COLOR[o.status]}`}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </span>
                </div>
                <ul className="mt-2 text-sm text-gray-700 space-y-1">
                  {o.items.map((it) => (
                    <li key={it.id} className="flex justify-between items-center">
                      <span>
                        <Link href={`/products/${it.productId}`} className="hover:text-brand-600">{it.name}</Link>
                        {it.variantName && <span className="text-xs text-gray-500"> ({it.variantName})</span>}
                        <span className="text-gray-500"> × {it.quantity}</span>
                      </span>
                      <span>{formatKRW(it.price * it.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2 text-sm">
                  <span className="text-gray-500">결제수단: {o.provider || "-"}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <OrderActionButtons
                      orderId={o.id}
                      orderNo={o.orderNo}
                      status={o.status}
                      hasTracking={!!(o.courier && o.trackingNo)}
                      reviewable={reviewable}
                    />
                    <span className="font-bold">총 {formatKRW(o.totalAmount)}</span>
                  </div>
                </div>
                {(o.couponDiscount > 0 || o.pointUsed > 0 || o.pointEarned > 0) && (
                  <div className="mt-2 text-[11px] text-gray-500 flex gap-3 flex-wrap">
                    {o.couponDiscount > 0 && <span>쿠폰 -{formatKRW(o.couponDiscount)}</span>}
                    {o.pointUsed > 0 && <span>적립금 -{formatKRW(o.pointUsed)}</span>}
                    {o.pointEarned > 0 && <span className="text-emerald-600">적립 +{formatKRW(o.pointEarned)}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
