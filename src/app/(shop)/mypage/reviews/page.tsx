import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/utils";
import ReviewWriteList from "./ReviewWriteList";

export const dynamic = "force-dynamic";

export default async function MyReviewsPage({ searchParams }: { searchParams: { orderId?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/mypage/reviews");
  const userId = (session.user as any).id as string;

  // 작성 가능한 주문 항목 (DELIVERED 상태 + 아직 리뷰 미작성)
  const writableItems = await prisma.orderItem.findMany({
    where: {
      order: {
        userId,
        status: "DELIVERED",
        ...(searchParams.orderId ? { id: searchParams.orderId } : {}),
      },
      // orderItemId로 연결된 리뷰가 없는 항목만 (Prisma 1:1 관계)
      // (작성 후에는 review.orderItemId 가 채워짐)
    },
    include: {
      order: { select: { orderNo: true, deliveredAt: true } },
      product: { select: { id: true, name: true, thumbnail: true } },
    },
    orderBy: { order: { deliveredAt: "desc" } },
    take: 50,
  });

  // 이미 리뷰 작성된 orderItemId 제외
  const reviewedIds = new Set(
    (await prisma.review.findMany({
      where: { userId, orderItemId: { in: writableItems.map((i) => i.id) } },
      select: { orderItemId: true },
    })).map((r) => r.orderItemId).filter(Boolean) as string[]
  );
  const writable = writableItems.filter((i) => !reviewedIds.has(i.id));

  // 내가 작성한 리뷰
  const myReviews = await prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { id: true, name: true, thumbnail: true } } },
    take: 50,
  });

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">내 리뷰</h1>

      <section>
        <h2 className="font-bold pb-2 border-b border-gray-200 mb-3 text-sm">
          작성 가능한 리뷰 ({writable.length})
          <span className="ml-2 text-[11px] text-gray-400 font-normal">배송완료된 상품에 대해 작성할 수 있습니다</span>
        </h2>
        {writable.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">작성 가능한 리뷰가 없습니다.</p>
        ) : (
          <ReviewWriteList
            items={writable.map((i) => ({
              orderItemId: i.id,
              productId: i.product.id,
              productName: i.product.name,
              productThumbnail: i.product.thumbnail,
              variantName: i.variantName,
              orderNo: i.order.orderNo,
              deliveredAt: i.order.deliveredAt,
            }))}
          />
        )}
      </section>

      <section>
        <h2 className="font-bold pb-2 border-b border-gray-200 mb-3 text-sm">작성한 리뷰 ({myReviews.length})</h2>
        {myReviews.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">작성한 리뷰가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {myReviews.map((r) => (
              <li key={r.id} className="border border-gray-200 rounded p-4 bg-white">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded bg-gray-100 overflow-hidden border border-gray-100 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.product.thumbnail || "/images/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${r.product.id}`} className="text-sm font-medium hover:text-brand-600 line-clamp-1">
                      {r.product.name}
                    </Link>
                    <div className="mt-1 text-amber-400 text-sm">
                      {[1, 2, 3, 4, 5].map((n) => <span key={n}>{r.rating >= n ? "★" : "☆"}</span>)}
                      <span className="ml-2 text-gray-400 text-xs">{r.createdAt.toLocaleDateString("ko-KR")}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-line line-clamp-3">{r.content}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
