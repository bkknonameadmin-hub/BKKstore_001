import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { noticeCategoryMeta } from "@/lib/cms";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const notice = await prisma.notice.findUnique({
    where: { id: params.id },
    select: { title: true, isPublished: true },
  }).catch(() => null);
  if (!notice || !notice.isPublished) return { title: "공지를 찾을 수 없습니다", robots: { index: false } };
  return { title: notice.title };
}

export default async function NoticeDetailPage({ params }: { params: { id: string } }) {
  const notice = await prisma.notice.findUnique({ where: { id: params.id } }).catch(() => null);
  if (!notice || !notice.isPublished) notFound();

  // 비차단 조회수 증가 (실패해도 무시)
  prisma.notice.update({ where: { id: notice.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const meta = noticeCategoryMeta(notice.category);

  return (
    <div className="container-mall py-6 md:py-8 max-w-3xl">
      <nav className="text-xs text-gray-500 mb-4">
        <Link href="/" className="hover:text-brand-600">홈</Link>
        <span className="mx-1">›</span>
        <Link href="/notice" className="hover:text-brand-600">공지사항</Link>
      </nav>

      <article className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <header className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
              meta.tone === "danger" ? "bg-rose-100 text-rose-700" :
              meta.tone === "warning" ? "bg-amber-100 text-amber-700" :
              "bg-gray-100 text-gray-700"
            }`}>{meta.label}</span>
            {notice.isPinned && <span className="text-rose-500 text-xs">📌 고정</span>}
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{notice.title}</h1>
          <div className="mt-3 text-xs text-gray-400 flex items-center gap-3">
            <time>{new Date(notice.publishedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</time>
            <span>조회 {notice.viewCount.toLocaleString()}</span>
          </div>
        </header>
        <div className="p-6 text-sm text-gray-700 leading-relaxed whitespace-pre-line min-h-[200px]">
          {notice.content}
        </div>
      </article>

      <div className="mt-6">
        <Link href="/notice" className="btn-outline">목록으로</Link>
      </div>
    </div>
  );
}
