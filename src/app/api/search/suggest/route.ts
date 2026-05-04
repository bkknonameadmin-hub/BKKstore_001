import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 검색 자동완성 — 상품/브랜드/카테고리 통합
 * GET /api/search/suggest?q=검색어
 */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") || "").trim();
  if (q.length < 1) return NextResponse.json({ products: [], brands: [], categories: [] });
  if (q.length > 50) return NextResponse.json({ products: [], brands: [], categories: [] });

  try {
    const [products, brands, categories] = await Promise.all([
      prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, brand: true, thumbnail: true, price: true, salePrice: true },
        take: 6,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      }),
      prisma.product.findMany({
        where: { isActive: true, brand: { contains: q, mode: "insensitive" } },
        select: { brand: true },
        distinct: ["brand"],
        take: 5,
      }),
      prisma.category.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        select: { id: true, name: true, slug: true, parentId: true },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      products,
      brands: brands.map((b) => b.brand).filter(Boolean),
      categories,
    });
  } catch {
    return NextResponse.json({ products: [], brands: [], categories: [] });
  }
}
