import { PageHeader } from "@/components/admin/AdminUI";
import NoticeForm from "../NoticeForm";

export default function AdminNoticeNewPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="공지 작성"
        breadcrumbs={[{ href: "/admin", label: "관리자" }, { href: "/admin/notices", label: "공지사항" }, { label: "작성" }]}
      />
      <NoticeForm />
    </div>
  );
}
