import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: "new", label: "신상품순" },
  { value: "best", label: "인기순" },
  { value: "low", label: "낮은가격순" },
  { value: "high", label: "높은가격순" },
];

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const q = (searchParams.q as string) || "";
  const category = (searchParams.category as string) || "";
  const sort = (searchParams.sort as string) || "new";
  const sale = searchParams.sale === "1";
  const page = Math.max(1, parseInt((searchParams.page as string) || "1", 10));

  const where: Prisma.ProductWhereInput = { isActive: true };
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { brand: { contains: q, mode: "insensitive" } }];
  if (category) where.category = { slug: category };
  if (sale) where.salePrice = { not: null };

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "low") orderBy = { price: "asc" };
  else if (sort === "high") orderBy = { price: "desc" };
  else if (sort === "best") orderBy = { isFeatured: "desc" };

  const [items, total, categories] = await Promise.all([
    prisma.product.findMany({ where, orderBy, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }).catch(() => []),
    prisma.product.count({ where }).catch(() => 0),
    prisma.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" } }).catch(() => []),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentCategoryName = categories.find((c) => c.slug === category)?.name;

  return (
    <div className="container-mall py-6">
      {/* breadcrumb */}
      <nav className="text-xs text-gray-500 mb-4">
        <Link href="/" className="hover:text-brand-600">홈</Link>
        <span className="mx-1">›</span>
        <Link href="/products" className="hover:text-brand-600">전체상품</Link>
        {currentCategoryName && (
          <>
            <span className="mx-1">›</span>
            <span className="text-gray-700">{currentCategoryName}</span>
          </>
        )}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
        {/* 사이드 카테고리 */}
        <aside className="border border-gray-200 rounded p-4 h-fit">
          <h3 className="font-bold text-sm mb-3">카테고리</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/products" className={!category ? "text-brand-600 font-semibold" : "text-gray-700 hover:text-brand-600"}>
                전체
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/products?category=${c.slug}`}
                  className={category === c.slug ? "text-brand-600 font-semibold" : "text-gray-700 hover:text-brand-600"}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* 본문 */}
        <div>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <h1 className="text-xl font-bold">
              {currentCategoryName || (q ? `"${q}" 검색 결과` : "전체상품")}
              <span className="ml-2 text-sm font-normal text-gray-500">총 {total.toLocaleString()}개</span>
            </h1>
            <div className="flex items-center gap-2 text-sm">
              {SORT_OPTIONS.map((opt) => (
                <Link
                  key={opt.value}
                  href={{ query: { ...searchParams, sort: opt.value, page: undefined } }}
                  className={sort === opt.value ? "text-brand-600 font-semibold" : "text-gray-500 hover:text-brand-600"}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="py-20 text-center text-gray-500">조건에 맞는 상품이 없습니다.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {items.map((p) => (
                  <ProductCard key={p.id} {...p} />
                ))}
              </div>

              {/* 페이지네이션 */}
              <div className="mt-10 flex justify-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const n = i + 1;
                  return (
                    <Link
                      key={n}
                      href={{ query: { ...searchParams, page: n } }}
                      className={`min-w-9 h-9 px-3 inline-flex items-center justify-center rounded text-sm border ${
                        n === page
                          ? "bg-brand-500 text-white border-brand-500"
                          : "bg-white text-gray-700 border-gray-200 hover:border-brand-500"
                      }`}
                    >
                      {n}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
