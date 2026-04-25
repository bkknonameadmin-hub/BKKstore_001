import Link from "next/link";
import CategoryNav from "./CategoryNav";
import CartBadge from "./CartBadge";

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
      {/* 상단 유틸 바 */}
      <div className="border-b border-gray-100 text-xs text-gray-600">
        <div className="container-mall flex items-center justify-end h-9 gap-4">
          <Link href="/login" className="hover:text-brand-600">로그인</Link>
          <Link href="/register" className="hover:text-brand-600">회원가입</Link>
          <Link href="/orders" className="hover:text-brand-600">주문조회</Link>
          <Link href="/mypage" className="hover:text-brand-600">마이페이지</Link>
          <Link href="/support" className="hover:text-brand-600">고객센터</Link>
        </div>
      </div>

      {/* 메인 헤더: 로고 + 검색 + 장바구니 */}
      <div className="container-mall flex items-center justify-between py-5 gap-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-brand-600">낚시몰</span>
          <span className="hidden md:inline text-xs text-gray-500">FISHING MALL</span>
        </Link>

        <form action="/products" className="flex-1 max-w-xl">
          <div className="flex border-2 border-brand-500 rounded">
            <input
              name="q"
              type="search"
              placeholder="상품명, 브랜드를 검색하세요"
              className="flex-1 px-4 py-2 outline-none text-sm"
            />
            <button type="submit" className="px-5 bg-brand-500 text-white text-sm font-medium">
              검색
            </button>
          </div>
        </form>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/cart" className="relative flex items-center gap-1 hover:text-brand-600">
            <span>🛒</span>
            <span>장바구니</span>
            <CartBadge />
          </Link>
        </div>
      </div>

      {/* 카테고리 네비게이션 */}
      <CategoryNav />
    </header>
  );
}
