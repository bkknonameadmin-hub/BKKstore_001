import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";

export const revalidate = 60;

export default async function HomePage() {
  const [featured, newest] = await Promise.all([
    prisma.product
      .findMany({ where: { isActive: true, isFeatured: true }, take: 8, orderBy: { createdAt: "desc" } })
      .catch(() => []),
    prisma.product
      .findMany({ where: { isActive: true }, take: 12, orderBy: { createdAt: "desc" } })
      .catch(() => []),
  ]);

  return (
    <div className="container-mall py-6 space-y-12">
      {/* 메인 히어로 배너 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 h-72 rounded bg-gradient-to-br from-brand-700 to-brand-500 text-white flex items-center px-10">
          <div>
            <div className="text-sm opacity-80">시즌 특가</div>
            <h2 className="text-3xl font-bold mt-2">봄 시즌 낚시용품 대전</h2>
            <p className="mt-2 opacity-90">최대 30% 할인 · 무료배송 5만원 이상</p>
            <Link href="/products?sale=1" className="mt-5 inline-block btn bg-white text-brand-700 hover:bg-gray-100">
              할인상품 보러가기
            </Link>
          </div>
        </div>
        <div className="grid grid-rows-2 gap-3">
          <Link href="/products?category=rod" className="h-full rounded bg-gray-900 text-white flex items-center px-6">
            <div>
              <div className="text-xs opacity-70">신상품</div>
              <div className="text-lg font-bold mt-1">2026 신상 낚싯대</div>
            </div>
          </Link>
          <Link href="/products?category=reel" className="h-full rounded bg-accent-500 text-white flex items-center px-6">
            <div>
              <div className="text-xs opacity-90">인기 카테고리</div>
              <div className="text-lg font-bold mt-1">베스트 릴 모음</div>
            </div>
          </Link>
        </div>
      </section>

      {/* 추천상품 */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-xl font-bold">추천상품</h2>
          <Link href="/products" className="text-sm text-gray-500 hover:text-brand-600">더보기 →</Link>
        </div>
        {featured.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {featured.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        )}
      </section>

      {/* 신상품 */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-xl font-bold">신상품</h2>
          <Link href="/products?sort=new" className="text-sm text-gray-500 hover:text-brand-600">더보기 →</Link>
        </div>
        {newest.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {newest.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        )}
      </section>
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
