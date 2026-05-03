import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SupportForm from "./SupportForm";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "신규",
  PENDING: "확인중",
  ANSWERED: "답변완료",
  CLOSED: "종료",
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700",
  PENDING: "bg-amber-50 text-amber-700",
  ANSWERED: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-gray-100 text-gray-500",
};
const CAT_LABEL: Record<string, string> = {
  ORDER: "주문", PAYMENT: "결제", DELIVERY: "배송", PRODUCT: "상품", REFUND: "환불", ACCOUNT: "계정", ETC: "기타",
};

export default async function SupportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/support");
  const userId = (session.user as any).id as string;

  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { lastMessageAt: "desc" },
    take: 30,
    include: { _count: { select: { messages: true } } },
  });

  return (
    <div className="container-mall py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div>
          <h1 className="text-xl font-bold mb-4">1:1 문의</h1>
          {tickets.length === 0 ? (
            <div className="py-12 text-center text-gray-500 border border-dashed border-gray-200 rounded">
              문의 내역이 없습니다.
            </div>
          ) : (
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li key={t.id} className="border border-gray-200 rounded p-4 bg-white">
                  <Link href={`/support/${t.id}`} className="block hover:bg-gray-50 -m-4 p-4 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[t.status]}`}>
                          {STATUS_LABEL[t.status]}
                        </span>
                        <span className="text-xs text-gray-500">[{CAT_LABEL[t.category] || t.category}]</span>
                      </div>
                      <span className="text-xs text-gray-400">{t.lastMessageAt.toLocaleDateString("ko-KR")}</span>
                    </div>
                    <h3 className="text-sm font-medium mt-2">{t.subject}</h3>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{t.ticketNo} · 메시지 {t._count.messages}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="border border-gray-200 rounded p-5 bg-white h-fit lg:sticky lg:top-32">
          <h2 className="font-bold text-sm mb-3">새 문의 작성</h2>
          <SupportForm />
        </aside>
      </div>
    </div>
  );
}
