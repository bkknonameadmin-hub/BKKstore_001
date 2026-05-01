import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdminApi } from "@/lib/admin-guard";

const RowSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  price: z.number().int().min(0),
  salePrice: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
  categorySlug: z.string().min(1),
  thumbnail: z.string().nullable().optional(),
  images: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

const Schema = z.object({ rows: z.array(RowSchema).min(1).max(2000) });

export async function POST(req: NextRequest) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { rows } = Schema.parse(await req.json());

    // 카테고리 slug → id 일괄 조회
    const slugs = Array.from(new Set(rows.map((r) => r.categorySlug)));
    const cats = await prisma.category.findMany({ where: { slug: { in: slugs } } });
    const slugToId = new Map(cats.map((c) => [c.slug, c.id]));

    let created = 0, updated = 0, failed = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        if (row.salePrice != null && row.salePrice >= row.price) throw new Error(`[${row.sku}] 할인가가 판매가 이상`);
        const categoryId = slugToId.get(row.categorySlug);
        if (!categoryId) throw new Error(`[${row.sku}] 존재하지 않는 카테고리: ${row.categorySlug}`);

        const data = {
          sku: row.sku,
          name: row.name,
          brand: row.brand ?? null,
          description: row.description ?? null,
          price: row.price,
          salePrice: row.salePrice ?? null,
          stock: row.stock,
          lowStockThreshold: row.lowStockThreshold ?? null,
          thumbnail: row.thumbnail ?? null,
          images: row.images,
          isActive: row.isActive,
          isFeatured: row.isFeatured,
          categoryId,
        };

        const exists = await prisma.product.findUnique({ where: { sku: row.sku }, select: { id: true } });
        if (exists) {
          await prisma.product.update({ where: { sku: row.sku }, data });
          updated++;
        } else {
          await prisma.product.create({ data });
          created++;
        }
      } catch (e: any) {
        failed++;
        errors.push(e.message || `${row.sku} 처리 실패`);
      }
    }

    return NextResponse.json({ created, updated, failed, errors });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "일괄 처리 실패" }, { status: 400 });
  }
}
