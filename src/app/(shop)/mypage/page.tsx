import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/utils";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/order-status";
import { getTierByAmount, nextTierProgress } from "@/lib/membership";

export const dynamic = "force-dynamic";
export const metadata = { title: "마이페이지" };

export default async function MyPageDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/mypage");

  const userId = (session.user as any).id as string;

  const [user, recentOrders, statusCounts, reviewableCount, usableCoupons] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true, email: true, pointBalance: true, lifetimeAmount: true, createdAt: true,
        _count: { select: { wishlist: true, reviews: true, orders: true } },
      },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { items: true },
    }).catch(() => []),
    prisma.order.groupBy({
      by: ["status"],
      where: { userId },
      _count: { id: true },
    }).catch(() => []),
    // 작성 가능한 리뷰: DELIVERED 상태 + 아직 리뷰 안쓴 orderItem
    prisma.orderItem.count({
      where: {
        order: { userId, status: "DELIVERED" },
        // Review 와 1:1 (orderItemId unique) — 없는 것만
        NOT: { id: { in: (await prisma.review.findMany({
          where: { userId, NOT: { orderItemId: null } },
          select: { orderItemId: true },
        }).catch(() => [])).map((r) => r.orderItemId!).filter(Boolean) } },
      },
    }).catch(() => 0),
    prisma.userCoupon.count({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    }).catch(() => 0),
  ]);

  if (!user) redirect("/login");

  const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count.id]));
  const inProgress = (statusMap.PAID || 0) + (statusMap.PREPARING || 0) + (statusMap.SHIPPED || 0);

  const tier = getTierByAmount(user.lifetimeAmount);
  const tierProgress = nextTierProgress(user.lifetimeAmount);

  const cards: { label: string; value: string | number; sub: string; href: string; tone: string; icon: string }[] = [
    { label: "보유 적립금", value: formatKRW(user.pointBalance), sub: "쇼핑 시 사용 가능", href: "/mypage/points", tone: "amber", icon: "💎" },
    { label: "사용가능 쿠폰", value: `${usableCoupons}장`, sub: "유효기간 내", href: "/mypage/coupons", tone: "brand", icon: "🎟" },
    { label: "위시리스트", value: `${user._count.wishlist}개`, sub: "찜한 상품", href: "/mypage/wishlist", tone: "rose", icon: "❤" },
    { label: "작성 가능 리뷰", value: `${reviewableCount}개`, sub: reviewableCount > 0 ? "리뷰 작성 시 적립금" : "최근 배송완료 없음", href: "/mypage/reviews", tone: "emerald", icon: "✍" },
  ];

  return (
    <div className="space-y-6">
      {/* 인사말 + 등급 카드 */}
      <header className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{user.name}님</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${tier.bgClass} ${tier.color}`}>
              <span>{tier.emoji}</span>
              <span>{tier.label}</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            가입일 {new Date(user.createdAt).toLocaleDateString("ko-KR")} · 누적 결제 {formatKRW(user.lifetimeAmount)}
          </p>

          {/* 다음 등급까지 진행 바 */}
          {tierProgress ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                <span>다음 등급 <b className={tierProgress.next.color}>{tierProgress.next.emoji} {tierProgress.next.label}</b> 까지</span>
                <span className="font-bold text-gray-700">{formatKRW(tierProgress.remaining)} 남음</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-300 transition-all"
                  style={{ width: `${Math.round(tierProgress.progress * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-rose-600 font-bold">🎉 최고 등급 회원입니다!</p>
          )}
        </div>

        <div className="md:w-56 shrink-0">
          <div className="text-[11px] text-gray-400 mb-1">현재 혜택</div>
          <ul className="text-xs text-gray-700 space-y-0.5">
            {tier.benefits.map((b, i) => <li key={i}>• {b}</li>)}
          </ul>
        </div>
      </header>

      {/* 핵심 KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`group bg-white rounded-lg border border-gray-200 p-4 hover:border-brand-500 hover:shadow-sm transition-all`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{c.label}</span>
              <span className="text-lg">{c.icon}</span>
            </div>
            <div className="mt-2 text-xl font-bold text-gray-900">{c.value}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{c.sub}</div>
          </Link>
        ))}
      </div>

      {/* 주문 진행 현황 */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <header className="flex items-center justify-between mb-3">
          <h2 className="font-bold">진행 중 주문</h2>
          <Link href="/mypage/orders" className="text-xs text-gray-500 hover:text-brand-600">전체 주문 →</Link>
        </header>
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatusCell label="결제완료" value={statusMap.PAID || 0} color="text-brand-600" />
          <StatusCell label="배송준비" value={statusMap.PREPARING || 0} color="text-amber-600" />
          <StatusCell label="배송중" value={statusMap.SHIPPED || 0} color="text-purple-600" />
          <StatusCell label="배송완료" value={statusMap.DELIVERED || 0} color="text-emerald-600" />
          <StatusCell label="결제대기" value={statusMap.PENDING || 0} color="text-gray-500" />
          <StatusCell label="취소/환불" value={(statusMap.CANCELLED || 0) + (statusMap.REFUNDED || 0)} color="text-rose-600" />
        </div>
      </section>

      {/* 최근 주문 */}
      <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <header className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-bold">최근 주문</h2>
          <Link href="/mypage/orders" className="text-xs text-gray-500 hover:text-brand-600">전체보기 →</Link>
        </header>
        {recentOrders.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            <div className="text-3xl mb-2">📦</div>
            아직 주문 내역이 없습니다.
            <div className="mt-3">
              <Link href="/products" className="btn-primary text-sm">상품 보러가기</Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentOrders.map((o) => (
              <li key={o.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-gray-700">{o.orderNo}</span>
                      <span className="text-gray-400">{o.createdAt.toLocaleDateString("ko-KR")}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ORDER_STATUS_COLOR[o.status]}`}>
                        {ORDER_STATUS_LABEL[o.status]}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm text-gray-800 truncate">
                      {o.items[0]?.name}{o.items.length > 1 && ` 외 ${o.items.length - 1}건`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold">{formatKRW(o.totalAmount)}</div>
                    {o.courier && o.trackingNo && (
                      <Link href={`/orders/${o.orderNo}/tracking`} className="text-[11px] text-brand-600 hover:underline mt-1 inline-block">
                        배송조회 →
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 빠른 액션 */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-2">바로가기</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { href: "/mypage/orders", label: "주문/배송", icon: "🧾" },
            { href: "/mypage/wishlist", label: "위시리스트", icon: "❤" },
            { href: "/mypage/coupons", label: "쿠폰함", icon: "🎟" },
            { href: "/mypage/points", label: "적립금", icon: "🪙" },
            { href: "/mypage/reviews", label: "내 리뷰", icon: "✍" },
            { href: "/mypage/security", label: "보안", icon: "🔒" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col items-center justify-center gap-1 py-4 rounded-lg border border-gray-200 hover:border-brand-500 hover:bg-brand-50/30 transition-colors bg-white"
            >
              <span className="text-2xl">{a.icon}</span>
              <span className="text-xs text-gray-700 font-medium">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded p-2 bg-gray-50">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-[11px] text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
