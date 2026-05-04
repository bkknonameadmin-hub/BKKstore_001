import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/AdminUI";
import NoticeForm from "../../NoticeForm";

export const dynamic = "force-dynamic";

export default async function AdminNoticeEditPage({ params }: { params: { id: string } }) {
  const notice = await prisma.notice.findUnique({ where: { id: params.id } }).catch(() => null);
  if (!notice) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="공지 수정"
        breadcrumbs={[{ href: "/admin", label: "관리자" }, { href: "/admin/notices", label: "공지사항" }, { label: "수정" }]}
      />
      <NoticeForm initial={{
        id: notice.id,
        title: notice.title,
        content: notice.content,
        category: notice.category,
        isPinned: notice.isPinned,
        isPublished: notice.isPublished,
      }} />
    </div>
  );
}
