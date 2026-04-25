import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TrackingViewer from "@/components/TrackingViewer";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/order-status";

export const dynamic = "force-dynamic";

export default async function CustomerTrackingPage({ params }: { params: { orderNo: string } }) {
  const order = await prisma.order.findUnique({
    where: { orderNo: params.orderNo },
    select: {
      id: true,
      orderNo: true,
      status: true,
      recipient: true,
      address1: true,
      address2: true,
      courier: true,
      trackingNo: true,
      shippedAt: true,
      deliveredAt: true,
    },
  });

  if (!order) notFound();

  return (
    <div className="container-mall py-10 max-w-2xl">
      <h1 className="text-xl font-bold mb-2">배송조회</h1>
      <p className="text-xs text-gray-500 font-mono mb-6">{order.orderNo}</p>

      <section className="border border-gray-200 rounded p-5 mb-4 bg-white">
        <dl className="text-sm space-y-1.5">
          <div className="flex justify-between">
            <dt className="text-gray-500">주문 상태</dt>
            <dd>
              <span className={`px-2 py-0.5 rounded text-xs ${ORDER_STATUS_COLOR[order.status]}`}>
                {ORDER_STATUS_LABEL[order.status]}
              </span>
            </dd>
          </div>
          <div className="flex justify-between"><dt className="text-gray-500">받는분</dt><dd>{order.recipient}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">배송지</dt><dd className="text-right">{order.address1} {order.address2}</dd></div>
          {order.shippedAt && (
            <div className="flex justify-between"><dt className="text-gray-500">발송일시</dt><dd className="text-xs">{order.shippedAt.toLocaleString("ko-KR")}</dd></div>
          )}
          {order.deliveredAt && (
            <div className="flex justify-between"><dt className="text-gray-500">완료일시</dt><dd className="text-xs">{order.deliveredAt.toLocaleString("ko-KR")}</dd></div>
          )}
        </dl>
      </section>

      <section className="border border-gray-200 rounded p-5 bg-white">
        <h2 className="font-bold text-sm pb-3 mb-3 border-b border-gray-100">배송 추적</h2>
        {order.courier && order.trackingNo ? (
          <TrackingViewer courier={order.courier} invoice={order.trackingNo} />
        ) : (
          <p className="text-sm text-gray-500">아직 송장이 등록되지 않았습니다. 발송 후 다시 확인해주세요.</p>
        )}
      </section>

      <div className="mt-6">
        <Link href="/mypage" className="text-sm text-gray-500 hover:text-brand-600">← 마이페이지로</Link>
      </div>
    </div>
  );
}
