import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/utils";

const NAV = [
  { href: "/mypage", label: "마이 대시보드", icon: "🏠" },
  { href: "/mypage/orders", label: "주문 내역", icon: "🧾" },
  { href: "/mypage/wishlist", label: "위시리스트", icon: "❤" },
  { href: "/mypage/coupons", label: "쿠폰함", icon: "🎟" },
  { href: "/mypage/points", label: "적립금 내역", icon: "🪙" },
  { href: "/mypage/reviews", label: "내 리뷰", icon: "✍" },
  { href: "/mypage/security", label: "보안 설정", icon: "🔒" },
];

export default async function MyPageLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/mypage");
  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true, email: true, pointBalance: true,
      _count: { select: { wishlist: true, userCoupons: true, orders: true } },
    },
  });
  if (!user) redirect("/login");

  const usableCoupons = await prisma.userCoupon.count({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
  });

  return (
    <div className="container-mall py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-3">
          <div className="border border-gray-200 rounded p-4 bg-white">
            <div className="text-xs text-gray-500">반갑습니다</div>
            <div className="text-base font-bold mt-1">{user.name}님</div>
            <div className="text-[11px] text-gray-400 truncate">{user.email}</div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <Link href="/mypage/points" className="rounded p-2 bg-amber-50 hover:bg-amber-100">
                <div className="text-[10px] text-gray-500">적립금</div>
                <div className="text-sm font-bold text-amber-700">{formatKRW(user.pointBalance)}</div>
              </Link>
              <Link href="/mypage/coupons" className="rounded p-2 bg-brand-50 hover:bg-brand-100">
                <div className="text-[10px] text-gray-500">사용가능 쿠폰</div>
                <div className="text-sm font-bold text-brand-700">{usableCoupons}장</div>
              </Link>
            </div>
          </div>

          <nav className="border border-gray-200 rounded bg-white overflow-hidden">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 border-b last:border-b-0 border-gray-100"
              >
                <span className="w-5">{n.icon}</span>
                <span>{n.label}</span>
                {n.href === "/mypage/orders" && user._count.orders > 0 && (
                  <span className="ml-auto text-[11px] text-gray-400">{user._count.orders}</span>
                )}
                {n.href === "/mypage/wishlist" && user._count.wishlist > 0 && (
                  <span className="ml-auto text-[11px] text-gray-400">{user._count.wishlist}</span>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
