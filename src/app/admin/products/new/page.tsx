import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductForm, { ProductFormValue } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

function suggestSku(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SKU-${ymd}-${rand}`;
}

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }] });

  const initial: ProductFormValue = {
    sku: suggestSku(),
    name: "",
    brand: "",
    description: "",
    price: "",
    salePrice: null,
    stock: 0,
    thumbnail: "",
    images: [],
    isActive: true,
    isFeatured: false,
    categoryId: "",
  };

  return (
    <div className="space-y-4">
      <nav className="text-xs text-gray-500">
        <Link href="/admin" className="hover:text-brand-600">관리자</Link>
        <span className="mx-1">›</span>
        <Link href="/admin/products" className="hover:text-brand-600">상품 관리</Link>
        <span className="mx-1">›</span>
        <span className="text-gray-700">상품 등록</span>
      </nav>
      <h1 className="text-xl font-bold">상품 등록</h1>
      <ProductForm mode="create" initial={initial} categories={categories} />
    </div>
  );
}
