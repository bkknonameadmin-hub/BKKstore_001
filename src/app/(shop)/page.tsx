import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import HeroCarousel from "@/components/HeroCarousel";
import CategoryShortcut from "@/components/CategoryShortcut";

export const revalidate = 60;

export default async function HomePage() {
  const [featured, newest, best, categories] = await Promise.all([
    prisma.product
      .findMany({
        where: { isActive: true, isFeatured: true },
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { reviews: { where: { isHidden: false } } } },
        },
      })
      .catch(() => []),
    prisma.product
      .findMany({
        where: { isActive: true },
        take: 12,
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),
    prisma.product
      .findMany({
        where: { isActive: true },
        take: 8,
        orderBy: [{ reviews: { _count: "desc" } }, { isFeatured: "desc" }],
        include: {
          _count: { select: { reviews: { where: { isHidden: false } } } },
          reviews: { where: { isHidden: false }, select: { rating: true } },
        },
      })
      .catch(() => []),
    prisma.category
      .findMany({
        where: { parentId: null },
        orderBy: { sortOrder: "asc" },
        take: 8,
        select: { id: true, name: true, slug: true },
      })
      .catch(() => []),
  ]);

  const bestWithRating = best.map((p) => {
    const sum = p.reviews.reduce((s, r) => s + r.rating, 0);
    const avg = p.reviews.length > 0 ? sum / p.reviews.length : 0;
    return { ...p, _avgRating: Math.round(avg * 10) / 10, _reviewCount: p._count.reviews };
  });

  const isEmpty = featured.length === 0 && newest.length === 0;

  return (
    <div className="container-mall py-4 md:py-6 space-y-10 md:space-y-14">
      {/* 메인 히어로 + 사이드 배너 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <HeroCarousel />
        </div>
        <div className="hidden lg:grid grid-rows-2 gap-3">
          <Link
            href="/products?category=rod"
            className="relative h-full rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center px-7 overflow-hidden group"
          >
            <div className="z-10">
              <div className="text-xs opacity-70">신상품</div>
              <div className="text-xl font-extrabold mt-1">2026 신상 낚싯대</div>
              <div className="text-xs opacity-80 mt-1">바로가기 →</div>
            </div>
            <div className="absolute -right-4 -bottom-4 text-7xl opacity-20 group-hover:scale-110 transition-transform">🎣</div>
          </Link>
          <Link
            href="/products?category=reel&sort=best"
            className="relative h-full rounded-xl bg-gradient-to-br from-accent-500 to-orange-400 text-white flex items-center px-7 overflow-hidden group"
          >
            <div className="z-10">
              <div className="text-xs opacity-90">인기 카테고리</div>
              <div className="text-xl font-extrabold mt-1">베스트 릴 모음</div>
              <div className="text-xs opacity-90 mt-1">바로가기 →</div>
            </div>
            <div className="absolute -right-4 -bottom-4 text-7xl opacity-20 group-hover:scale-110 transition-transform">🎰</div>
          </Link>
        </div>
      </section>

      {/* 카테고리 쇼트컷 */}
      {categories.length > 0 && (
        <CategoryShortcut categories={categories} />
      )}

      {/* 혜택 띠 (배송/포인트/리뷰) */}
      <section className="grid grid-cols-3 gap-2 md:gap-4 text-center">
        <Benefit icon="🚚" title="5만원 이상 무료배송" desc="전 상품 빠른 배송" />
        <Benefit icon="💎" title="구매 1% 적립" desc="포인트 즉시 사용 가능" />
        <Benefit icon="✍️" title="리뷰 작성 시 적립" desc="포토 리뷰 추가 적립" />
      </section>

      {isEmpty && <EmptyState />}

      {/* 베스트 랭킹 */}
      {bestWithRating.length > 0 && (
        <section>
          <SectionHeader title="🔥 실시간 베스트" subtitle="가장 많은 리뷰가 달린 인기 상품" href="/products?sort=best" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {bestWithRating.slice(0, 8).map((p, i) => (
              <ProductCard
                key={p.id}
                {...p}
                rank={i + 1}
                rating={p._avgRating}
                reviewCount={p._reviewCount}
              />
            ))}
          </div>
        </section>
      )}

      {/* 추천상품 */}
      {featured.length > 0 && (
        <section>
          <SectionHeader title="추천상품" subtitle="MD가 직접 고른 이번 주 추천" href="/products" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {featured.map((p) => (
              <ProductCard key={p.id} {...p} isFeatured />
            ))}
          </div>
        </section>
      )}

      {/* 신상품 */}
      {newest.length > 0 && (
        <section>
          <SectionHeader title="신상품" subtitle="새롭게 입고된 따끈따끈한 상품들" href="/products?sort=new" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
            {newest.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle, href }: { title: string; subtitle?: string; href: string }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <Link href={href} className="text-sm text-gray-500 hover:text-brand-600 shrink-0">더보기 →</Link>
    </div>
  );
}

function Benefit({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="card p-3 md:p-5 flex flex-col items-center gap-1">
      <div className="text-2xl md:text-3xl">{icon}</div>
      <div className="text-xs md:text-sm font-bold text-gray-800 mt-1">{title}</div>
      <div className="hidden md:block text-xs text-gray-500">{desc}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-gray-300 rounded p-10 text-center text-gray-500 text-sm">
      아직 상품이 없습니다. <code className="text-brand-600">npm run db:push && npm run db:seed</code> 으로 시드 데이터를 넣어보세요.
    </div>
  );
}
