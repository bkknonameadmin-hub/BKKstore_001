import { requireAdmin } from "@/lib/admin-guard";
import { getSiteSettings } from "@/lib/site-settings";
import SiteSettingsForm from "./SiteSettingsForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "사이트 설정 - 관리자" };

export default async function AdminSitePage() {
  await requireAdmin();
  const settings = await getSiteSettings();

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">사이트 설정</h1>
        <p className="text-sm text-gray-500 mt-1">
          홈 화면의 캐러셀, 배너, 푸터, 고지사항 등을 코드 수정 없이 편집할 수 있습니다.
        </p>
      </header>

      <SiteSettingsForm initial={settings} />
    </div>
  );
}
