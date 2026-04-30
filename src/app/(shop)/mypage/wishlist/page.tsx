import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcDiscountRate, formatKRW } from "@/lib/utils";
import WishlistItemActions from "./WishlistItemActions";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/mypage/wishlist");
  const userId = (session.user as any).id as string;

  const items = await prisma.wishlist.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { product: true },
  });

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">위시리스트 ({items.length})</h1>

      {items.length === 0 ? (
        <div className="py-12 text-center text-gray-500 border border-dashed border-gray-200 rounded">
          위시리스트가 비어 있습니다.
          <div className="mt-3">
            <Link href="/products" className="btn-primary text-sm">상품 둘러보기</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((w) => {
            const p = w.product;
            const finalPrice = p.salePrice ?? p.price;
            const discount = calcDiscountRate(p.price, p.salePrice);
            return (
              <div key={w.id} className="border border-gray-200 rounded overflow-hidden bg-white relative group">
                <Link href={`/products/${p.id}`}>
                  <div className="aspect-square bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumbnail || "/images/placeholder.svg"} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                </Link>
                <div className="p-3">
                  {p.brand && <div className="text-xs text-gray-500">{p.brand}</div>}
                  <Link href={`/products/${p.id}`} className="text-sm hover:text-brand-600 line-clamp-2 min-h-[2.5em]">{p.name}</Link>
                  <div className="mt-1 flex items-baseline gap-1">
                    {discount > 0 && <span className="text-accent-500 text-xs font-bold">{discount}%</span>}
                    <span className="text-base font-bold">{formatKRW(finalPrice)}</span>
                  </div>
                </div>
                <WishlistItemActions productId={p.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
