import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcDiscountRate, formatKRW } from "@/lib/utils";
import AddToCartSection from "./AddToCartSection";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = await prisma.product
    .findUnique({ where: { id: params.id }, include: { category: true } })
    .catch(() => null);

  if (!product || !product.isActive) notFound();

  const finalPrice = product.salePrice ?? product.price;
  const discount = calcDiscountRate(product.price, product.salePrice);

  return (
    <div className="container-mall py-6">
      <nav className="text-xs text-gray-500 mb-4">
        <Link href="/" className="hover:text-brand-600">홈</Link>
        <span className="mx-1">›</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-brand-600">
          {product.category.name}
        </Link>
        <span className="mx-1">›</span>
        <span className="text-gray-700">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* 이미지 */}
        <div>
          <div className="aspect-square bg-gray-100 rounded border border-gray-200 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.thumbnail || "/images/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.slice(0, 5).map((src, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded border border-gray-200 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 상품 정보 */}
        <div>
          {product.brand && <div className="text-sm text-gray-500">{product.brand}</div>}
          <h1 className="text-2xl font-bold mt-1">{product.name}</h1>

          <div className="mt-4 pb-4 border-b border-gray-200">
            {discount > 0 && (
              <div className="text-sm text-gray-400 line-through">{formatKRW(product.price)}</div>
            )}
            <div className="flex items-baseline gap-2">
              {discount > 0 && <span className="text-accent-500 font-bold text-xl">{discount}%</span>}
              <span className="text-3xl font-bold">{formatKRW(finalPrice)}</span>
            </div>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex">
              <dt className="w-24 text-gray-500">상품번호</dt>
              <dd className="text-gray-700">{product.sku}</dd>
            </div>
            <div className="flex">
              <dt className="w-24 text-gray-500">배송비</dt>
              <dd className="text-gray-700">3,000원 (50,000원 이상 무료)</dd>
            </div>
            <div className="flex">
              <dt className="w-24 text-gray-500">재고</dt>
              <dd className={product.stock > 0 ? "text-gray-700" : "text-red-500"}>
                {product.stock > 0 ? `${product.stock}개 보유` : "품절"}
              </dd>
            </div>
          </dl>

          <AddToCartSection
            product={{
              id: product.id,
              name: product.name,
              price: finalPrice,
              thumbnail: product.thumbnail,
              stock: product.stock,
            }}
          />
        </div>
      </div>

      {/* 상품 상세 설명 */}
      <section className="mt-14">
        <div className="border-b border-gray-200 mb-6">
          <h2 className="inline-block px-4 py-3 border-b-2 border-brand-500 font-bold">상품상세정보</h2>
        </div>
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line min-h-[120px]">
          {product.description || "상세 설명이 등록되지 않았습니다."}
        </div>
      </section>
    </div>
  );
}
