import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import AdminSignOutButton from "@/components/admin/AdminSignOutButton";

export const metadata = { title: "관리자 - 낚시몰" };

const NAV = [
  { href: "/admin", label: "대시보드", icon: "📊" },
  { href: "/admin/products", label: "상품 관리", icon: "📦" },
  { href: "/admin/orders", label: "주문 관리", icon: "🧾" },
  { href: "/admin/stock", label: "재고 관리", icon: "📉" },
  { href: "/admin/categories", label: "카테고리", icon: "🗂️" },
  { href: "/admin/coupons", label: "쿠폰 관리", icon: "🎟" },
  { href: "/admin/reviews", label: "리뷰 관리", icon: "✍" },
  { href: "/admin/users", label: "회원 관리", icon: "👤" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-800">
      {/* 사이드바 */}
      <aside className="w-56 bg-gray-900 text-gray-100 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <Link href="/admin" className="text-lg font-bold text-white">
            낚시몰 <span className="text-brand-500">Admin</span>
          </Link>
          <p className="text-[11px] text-gray-400 mt-0.5">관리자 페이지</p>
        </div>
        <nav className="flex-1 py-3 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-2 px-5 py-2.5 hover:bg-gray-800 transition-colors"
            >
              <span className="w-5 text-center">{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-gray-800 text-xs text-gray-400">
          <div className="text-gray-200 mb-1">{session.user?.name}</div>
          <div className="truncate mb-3">{session.user?.email}</div>
          <div className="flex gap-2">
            <Link href="/" className="flex-1 text-center px-2 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-200">
              스토어 ↗
            </Link>
            <AdminSignOutButton />
          </div>
        </div>
      </aside>

      {/* 본문 */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="text-sm text-gray-500">
            관리자 모드로 접속 중입니다.
          </div>
          <div className="text-sm text-gray-400">
            {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
          </div>
        </header>
        <main className="flex-1 p-6 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
