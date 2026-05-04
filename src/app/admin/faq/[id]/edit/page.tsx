import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/AdminUI";
import FaqForm from "../../FaqForm";

export const dynamic = "force-dynamic";

export default async function AdminFaqEditPage({ params }: { params: { id: string } }) {
  const faq = await prisma.faq.findUnique({ where: { id: params.id } }).catch(() => null);
  if (!faq) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="FAQ 수정"
        breadcrumbs={[{ href: "/admin", label: "관리자" }, { href: "/admin/faq", label: "FAQ" }, { label: "수정" }]}
      />
      <FaqForm initial={{
        id: faq.id,
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        sortOrder: faq.sortOrder,
        isPublished: faq.isPublished,
      }} />
    </div>
  );
}
