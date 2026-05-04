import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/utils";
import ReturnForm from "./ReturnForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "반품/교환 신청" };

const RETURN_WINDOW_DAYS = 7;

export default async function ReturnRequestPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?callbackUrl=/mypage/orders/${params.id}/return`);
  const userId = (session.user as any).id as string;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!order) notFound();
  if (order.userId !== userId) redirect("/mypage/orders");

  const isDelivered = order.status === "DELIVERED";
  const daysSince = order.deliveredAt
    ? (Date.now() - order.deliveredAt.getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  const withinWindow = isDelivered && daysSince <= RETURN_WINDOW_DAYS;

  // 이미 진행 중인 신청
  const existing = await prisma.returnRequest.findFirst({
    where: { orderId: order.id, status: { in: ["REQUESTED", "APPROVED", "PICKED_UP"] } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">반품/교환 신청</h1>
        <Link href="/mypage/orders" className="text-xs text-gray-500 hover:text-brand-600">← 주문 내역</Link>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="text-sm text-gray-500">주문번호</div>
        <div className="font-mono text-base font-bold">{order.orderNo}</div>
        <div className="text-xs text-gray-400 mt-1">
          배송완료: {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString("ko-KR") : "-"}
        </div>
      </section>

      {!isDelivered && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          배송 완료된 주문만 반품/교환 신청할 수 있습니다. 현재 상태: {order.status}
        </div>
      )}
      {isDelivered && !withinWindow && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm text-rose-800">
          반품/교환 신청 기간({RETURN_WINDOW_DAYS}일)이 지났습니다. 고객센터로 문의해주세요.
        </div>
      )}
      {withinWindow && existing && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
          이미 처리 중인 반품/교환 요청이 있습니다 (상태: {existing.status}).
        </div>
      )}

      {withinWindow && !existing && (
        <ReturnForm
          orderId={order.id}
          items={order.items.map((it) => ({
            id: it.id,
            name: it.name,
            variantName: it.variantName,
            price: it.price,
            quantity: it.quantity,
            refundedQuantity: it.refundedQuantity,
          }))}
        />
      )}
    </div>
  );
}
