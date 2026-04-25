import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "결제대기",
  PAID: "결제완료",
  PREPARING: "배송준비중",
  SHIPPED: "배송중",
  DELIVERED: "배송완료",
  CANCELLED: "취소",
  REFUNDED: "환불",
};

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
    <div className="container-mall py-6">
      <h1 className="text-xl font-bold mb-6">마이페이지</h1>
      <div className="text-sm text-gray-600 mb-6">
        안녕하세요 <b>{session.user.name}</b>님
      </div>

      <h2 className="font-bold pb-2 border-b-2 border-gray-800 mb-3">주문 내역</h2>
      {orders.length === 0 ? (
        <div className="py-12 text-center text-gray-500 border border-dashed border-gray-200 rounded">
          주문 내역이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="border border-gray-200 rounded p-4">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-mono text-gray-700">{o.orderNo}</span>
                  <span className="ml-3 text-gray-400">{o.createdAt.toLocaleDateString("ko-KR")}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-700 text-xs font-semibold">
                  {STATUS_LABEL[o.status] || o.status}
                </span>
              </div>
              <ul className="mt-2 text-sm text-gray-700">
                {o.items.map((it) => (
                  <li key={it.id} className="flex justify-between">
                    <span>{it.name} × {it.quantity}</span>
                    <span>{formatKRW(it.price * it.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center text-sm">
                <span className="text-gray-500">결제수단: {o.provider || "-"}</span>
                <div className="flex items-center gap-3">
                  {o.courier && o.trackingNo && (
                    <Link
                      href={`/orders/${o.orderNo}/tracking`}
                      className="text-xs px-2 py-1 rounded border border-brand-300 text-brand-700 hover:bg-brand-50"
                    >
                      배송조회
                    </Link>
                  )}
                  <span className="font-bold">총 {formatKRW(o.totalAmount)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link href="/" className="text-sm text-gray-500 hover:text-brand-600">← 홈으로</Link>
      </div>
    </div>
  );
}
