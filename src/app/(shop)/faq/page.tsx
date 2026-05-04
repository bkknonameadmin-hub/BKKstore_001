import { prisma } from "@/lib/prisma";
import { FAQ_CATEGORIES, faqCategoryMeta } from "@/lib/cms";
import FaqAccordion from "./FaqAccordion";

export const revalidate = 60;
export const metadata = { title: "자주 묻는 질문" };

export default async function FaqPage({ searchParams }: { searchParams: { cat?: string } }) {
  const cat = searchParams.cat || "";

  const faqs = await prisma.faq.findMany({
    where: { isPublished: true, ...(cat ? { category: cat } : {}) },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  }).catch(() => []);

  // 카테고리별 그룹
  const byCategory: Record<string, typeof faqs[number][]> = {};
  for (const f of faqs) {
    (byCategory[f.category] ||= []).push(f);
  }

  return (
    <div className="container-mall py-6 md:py-8 max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">자주 묻는 질문</h1>
        <p className="text-sm text-gray-500 mt-1">고객님이 궁금해하시는 질문을 모았습니다.</p>
      </header>

      {/* 카테고리 필터 */}
      <nav className="flex flex-wrap gap-2 mb-6">
        <a
          href="/faq"
          className={`px-3 h-9 rounded-full text-sm inline-flex items-center border ${
            !cat ? "bg-brand-500 text-white border-brand-500" : "bg-white text-gray-700 border-gray-300 hover:border-brand-500"
          }`}
        >전체</a>
        {FAQ_CATEGORIES.map((c) => (
          <a
            key={c.value}
            href={`/faq?cat=${c.value}`}
            className={`px-3 h-9 rounded-full text-sm inline-flex items-center border ${
              cat === c.value ? "bg-brand-500 text-white border-brand-500" : "bg-white text-gray-700 border-gray-300 hover:border-brand-500"
            }`}
          >{c.label}</a>
        ))}
      </nav>

      {faqs.length === 0 ? (
        <div className="py-20 text-center text-gray-500 bg-white border border-gray-200 rounded-lg">
          <div className="text-4xl mb-2">📭</div>
          <p>등록된 FAQ가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCategory).map(([catKey, items]) => (
            <section key={catKey}>
              <h2 className="text-sm font-bold text-brand-600 mb-2">{faqCategoryMeta(catKey).label}</h2>
              <FaqAccordion items={items.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))} />
            </section>
          ))}
        </div>
      )}

      <div className="mt-10 text-center text-sm text-gray-500">
        원하는 답변을 찾지 못하셨나요? <a href="/support" className="text-brand-600 hover:underline font-medium">1:1 문의하기</a>
      </div>
    </div>
  );
}
