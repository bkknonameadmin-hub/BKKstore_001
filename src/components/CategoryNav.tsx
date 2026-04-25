import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function CategoryNav() {
  const categories = await prisma.category
    .findMany({
      where: { parentId: null },
      orderBy: { sortOrder: "asc" },
      include: { children: true },
    })
    .catch(() => []);

  return (
    <nav className="border-t border-gray-100 bg-gray-50">
      <div className="container-mall flex items-center gap-1 h-11 overflow-x-auto">
        <Link href="/products" className="px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-white">
          전체상품
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/products?category=${c.slug}`}
            className="px-3 py-2 text-sm text-gray-700 hover:text-brand-600 whitespace-nowrap"
          >
            {c.name}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-3 text-xs">
          <Link href="/products?sort=new" className="text-gray-500 hover:text-brand-600">신상품</Link>
          <Link href="/products?sort=best" className="text-gray-500 hover:text-brand-600">베스트</Link>
          <Link href="/products?sale=1" className="text-accent-500 font-semibold">할인특가</Link>
        </div>
      </div>
    </nav>
  );
}
