import { PageHeader } from "@/components/admin/AdminUI";
import FaqForm from "../FaqForm";

export default function AdminFaqNewPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="FAQ 추가"
        breadcrumbs={[{ href: "/admin", label: "관리자" }, { href: "/admin/faq", label: "FAQ" }, { label: "추가" }]}
      />
      <FaqForm />
    </div>
  );
}
