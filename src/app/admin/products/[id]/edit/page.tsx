import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductForm, { ProductFormValue } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id: params.id } }),
    prisma.category.findMany({ orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  if (!product) notFound();

  const initial: ProductFormValue = {
    id: product.id,
    sku: product.sku,
    name: product.name,
    brand: product.brand || "",
    description: product.description || "",
    price: product.price,
    salePrice: product.salePrice,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold ?? null,
    thumbnail: product.thumbnail || "",
    images: product.images || [],
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    categoryId: product.categoryId,
  };

  return (
    <div className="space-y-4">
      <nav className="text-xs text-gray-500">
        <Link href="/admin" className="hover:text-brand-600">관리자</Link>
        <span className="mx-1">›</span>
        <Link href="/admin/products" className="hover:text-brand-600">상품 관리</Link>
        <span className="mx-1">›</span>
        <span className="text-gray-700">상품 수정</span>
      </nav>
      <div className="flex items-end justify-between">
        <h1 className="text-xl font-bold">상품 수정</h1>
        <Link
          href={`/products/${product.id}`}
          target="_blank"
          className="text-xs text-gray-500 hover:text-brand-600"
        >
          스토어에서 보기 ↗
        </Link>
      </div>
      <ProductForm mode="edit" initial={initial} categories={categories} />
    </div>
  );
}
