import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcDiscountRate, formatKRW } from "@/lib/utils";
import AddToCartSection from "./AddToCartSection";
import WishlistButton from "@/components/WishlistButton";
import ProductReviewSection from "@/components/ProductReviewSection";
import ProductJsonLd from "@/components/ProductJsonLd";
import ViewItemTracker from "@/components/ViewItemTracker";
import ImageGallery from "@/components/ImageGallery";
import ProductInfoTabs from "@/components/ProductInfoTabs";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
const SITE_NAME = process.env.NEXT_PUBLIC_BUSINESS_NAME || "낚시몰";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const product = await prisma.product
    .findUnique({
      where: { id: params.id },
      select: { name: true, brand: true, description: true, thumbnail: true, salePrice: true, price: true, isActive: true, category: { select: { name: true } } },
    })
    .catch(() => null);

  if (!product || !product.isActive) {
    return { title: "상품을 찾을 수 없습니다", robots: { index: false } };
  }

  const finalPrice = product.salePrice ?? product.price;
  const desc = (product.description || `${product.name} - ${product.category.name} | ${SITE_NAME}`).slice(0, 160);
  const titleLine = product.brand ? `${product.brand} ${product.name}` : product.name;
  const image = product.thumbnail
    ? (product.thumbnail.startsWith("http") ? product.thumbnail : `${SITE}${product.thumbnail}`)
    : `${SITE}/images/og-default.png`;

  return {
    title: titleLine,
    description: `${desc} - ${finalPrice.toLocaleString()}원`,
    openGraph: {
      type: "website",
      title: `${titleLine} | ${SITE_NAME}`,
      description: desc,
      images: [{ url: image, width: 1200, height: 630, alt: product.name }],
      url: `${SITE}/products/${params.id}`,
    },
    twitter: { card: "summary_large_image", title: titleLine, description: desc, images: [image] },
    alternates: { canonical: `${SITE}/products/${params.id}` },
  };
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  const product = await prisma.product
    .findUnique({
      where: { id: params.id },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    })
    .catch(() => null);

  if (!product || !product.isActive) notFound();

  const finalPrice = product.salePrice ?? product.price;
  const discount = calcDiscountRate(product.price, product.salePrice);

  // 위시리스트 여부
  const inWishlist = userId
    ? !!(await prisma.wishlist.findUnique({ where: { userId_productId: { userId, productId: product.id } } }).catch(() => null))
    : false;

  // 평점 집계
  const ratingAgg = await prisma.review.aggregate({
    where: { productId: product.id, isHidden: false },
    _avg: { rating: true },
    _count: { rating: true },
  }).catch(() => ({ _avg: { rating: null }, _count: { rating: 0 } }));

  const totalStock = product.variants.length > 0
    ? product.variants.reduce((s, v) => s + v.stock, 0)
    : product.stock;

  return (
    <div className="container-mall py-6">
      {/* SEO 구조화 데이터 */}
      <ProductJsonLd
        id={product.id}
        name={product.name}
        description={product.description}
        brand={product.brand}
        sku={product.sku}
        thumbnail={product.thumbnail}
        images={product.images}
        price={product.price}
        salePrice={product.salePrice}
        inStock={totalStock > 0}
        ratingValue={ratingAgg._avg.rating || undefined}
        reviewCount={ratingAgg._count.rating}
      />
      {/* GA4 view_item 이벤트 */}
      <ViewItemTracker
        id={product.id}
        name={product.name}
        brand={product.brand}
        category={product.category.name}
        price={finalPrice}
      />

      <nav className="text-xs text-gray-500 mb-4">
        <Link href="/" className="hover:text-brand-600">홈</Link>
        <span className="mx-1">›</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-brand-600">
          {product.category.name}
        </Link>
        <span className="mx-1">›</span>
        <span className="text-gray-700">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        {/* 이미지 */}
        <ImageGallery
          thumbnail={product.thumbnail}
          images={product.images}
          alt={product.name}
        />

        {/* 상품 정보 (데스크톱에서 sticky) */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {product.brand && <div className="text-sm text-gray-500">{product.brand}</div>}
              <h1 className="text-2xl font-bold mt-1">{product.name}</h1>
            </div>
            <WishlistButton productId={product.id} initialActive={inWishlist} signedIn={!!userId} />
          </div>

          {/* 평점 요약 */}
          {ratingAgg._count.rating > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Stars value={ratingAgg._avg.rating || 0} />
              <span className="font-bold">{(ratingAgg._avg.rating || 0).toFixed(1)}</span>
              <span className="text-gray-500">리뷰 {ratingAgg._count.rating}개</span>
            </div>
          )}

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
              <dd className={(product.variants.length > 0 || product.stock > 0) ? "text-gray-700" : "text-red-500"}>
                {product.variants.length > 0
                  ? `옵션별 재고 — 총 ${product.variants.reduce((s, v) => s + v.stock, 0)}개`
                  : product.stock > 0 ? `${product.stock}개 보유` : "품절"}
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
            variants={product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              colorHex: v.colorHex,
              optionType: v.optionType,
              stock: v.stock,
              priceModifier: v.priceModifier,
              thumbnail: v.thumbnail,
            }))}
          />
        </div>
      </div>

      {/* 탭 (sticky) */}
      <div className="mt-12">
        <ProductInfoTabs />
      </div>

      {/* 상품 상세 설명 */}
      <section id="section-detail" className="pt-8 scroll-mt-24">
        <h2 className="text-lg font-bold mb-4 text-gray-900">상품상세정보</h2>
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line min-h-[120px] py-4">
          {product.description || "상세 설명이 등록되지 않았습니다."}
        </div>
      </section>

      {/* 배송 / 반품 안내 */}
      <section id="section-shipping" className="pt-12 scroll-mt-24">
        <h2 className="text-lg font-bold mb-4 text-gray-900">배송 / 교환·반품 안내</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="card p-5">
            <h3 className="font-bold mb-2 text-gray-800">🚚 배송 안내</h3>
            <ul className="space-y-1.5 text-gray-600">
              <li>• 평일 14시 이전 결제 시 당일 출고</li>
              <li>• 배송비 3,000원 (5만원 이상 무료)</li>
              <li>• 도서/산간 지역 추가 배송비 발생 가능</li>
              <li>• 평균 1~3일 소요 (CJ대한통운)</li>
            </ul>
          </div>
          <div className="card p-5">
            <h3 className="font-bold mb-2 text-gray-800">↩ 교환·반품</h3>
            <ul className="space-y-1.5 text-gray-600">
              <li>• 상품 수령 후 7일 이내 신청</li>
              <li>• 단순 변심 반품 배송비 5,000원 (왕복)</li>
              <li>• 상품 불량/오배송은 무료 교환·반품</li>
              <li>• 사용/훼손/포장 개봉 후 반품 불가</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 리뷰 섹션 */}
      <section id="section-reviews" className="pt-12 scroll-mt-24">
        <ProductReviewSection productId={product.id} />
      </section>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-400 tracking-tight">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}>{value >= n ? "★" : value >= n - 0.5 ? "☆" : "☆"}</span>
      ))}
    </span>
  );
}
