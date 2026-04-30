import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/utils";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/order-status";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/mypage");

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
      <h1 className="text-xl font-bold mb-4">주문 내역</h1>

      {orders.length === 0 ? (
        <div className="py-12 text-center text-gray-500 border border-dashed border-gray-200 rounded">
          주문 내역이 없습니다.
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
                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center text-sm">
                  <span className="text-gray-500">결제수단: {o.provider || "-"}</span>
                  <div className="flex items-center gap-2">
                    {o.courier && o.trackingNo && (
                      <Link
                        href={`/orders/${o.orderNo}/tracking`}
                        className="text-xs px-2 py-1 rounded border border-brand-300 text-brand-700 hover:bg-brand-50"
                      >
                        배송조회
                      </Link>
                    )}
                    {reviewable && (
                      <Link
                        href={`/mypage/reviews?orderId=${o.id}`}
                        className="text-xs px-2 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-50"
                      >
                        리뷰 작성
                      </Link>
                    )}
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
