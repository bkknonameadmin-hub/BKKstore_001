import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import CategoryNav from "./CategoryNav";
import CartBadge from "./CartBadge";
import HeaderSignOut from "./HeaderSignOut";
import MobileNav from "./MobileNav";

export default async function Header() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const admin = isAdminEmail(user?.email);

  // 모바일 드로어용 카테고리 (서버 사이드에서 1번 쿼리)
  const categories = await prisma.category
    .findMany({
      where: { parentId: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    })
    .catch(() => []);

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
      {/* 상단 유틸 바 (데스크톱 전용) */}
      <div className="hidden md:block border-b border-gray-100 text-xs text-gray-600">
        <div className="container-mall flex items-center justify-end h-9 gap-4">
          {user ? (
            <>
              <span className="text-gray-700"><b>{user.name}</b>님</span>
              <HeaderSignOut />
              <Link href="/mypage" className="hover:text-brand-600">마이페이지</Link>
              <Link href="/mypage/wishlist" className="hover:text-brand-600">위시리스트</Link>
              <Link href="/mypage/coupons" className="hover:text-brand-600">쿠폰함</Link>
              {admin && <Link href="/admin" className="text-purple-600 hover:text-purple-800 font-bold">관리자</Link>}
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-brand-600">로그인</Link>
              <Link href="/register" className="hover:text-brand-600">회원가입</Link>
              <Link href="/mypage" className="hover:text-brand-600">주문조회</Link>
            </>
          )}
          <Link href="/support" className="hover:text-brand-600">고객센터</Link>
        </div>
      </div>

      {/* 메인 헤더 */}
      <div className="container-mall flex items-center justify-between gap-3 md:gap-6 py-3 md:py-5">
        {/* 모바일: 햄버거 */}
        <MobileNav
          categories={categories}
          user={user ? { name: user.name, email: user.email } : null}
          isAdmin={admin}
        />

        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl md:text-2xl font-extrabold text-brand-600 tracking-tight">낚시몰</span>
          <span className="hidden md:inline text-xs text-gray-500">FISHING MALL</span>
        </Link>

        {/* 데스크톱 검색바 */}
        <form action="/products" className="hidden md:block flex-1 max-w-xl">
          <div className="flex border-2 border-brand-500 rounded">
            <input
              name="q"
              type="search"
              placeholder="상품명, 브랜드를 검색하세요"
              className="flex-1 px-4 py-2 outline-none text-sm bg-white"
            />
            <button type="submit" className="px-5 bg-brand-500 text-white text-sm font-medium hover:bg-brand-600">
              검색
            </button>
          </div>
        </form>

        {/* 우측 액션 */}
        <div className="flex items-center gap-1 md:gap-4 text-sm">
          {/* 모바일: 검색 아이콘 (상품 페이지로) */}
          <Link href="/products" aria-label="검색" className="md:hidden p-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
          </Link>

          {/* 장바구니 */}
          <Link href="/cart" className="relative flex items-center gap-1 hover:text-brand-600 p-2 md:p-0" aria-label="장바구니">
            <svg className="md:hidden" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
            </svg>
            <span className="hidden md:inline">🛒 장바구니</span>
            <CartBadge />
          </Link>
        </div>
      </div>

      {/* 카테고리 네비게이션 (데스크톱 전용) */}
      <div className="hidden md:block">
        <CategoryNav />
      </div>
    </header>
  );
}
