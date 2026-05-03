import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ReplyForm from "./ReplyForm";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "신규", PENDING: "확인중", ANSWERED: "답변완료", CLOSED: "종료",
};

export default async function SupportTicketPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?callbackUrl=/support/${params.id}`);
  const userId = (session.user as any).id as string;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket || ticket.userId !== userId) notFound();

  return (
    <div className="container-mall py-6 max-w-2xl">
      <Link href="/support" className="text-xs text-gray-500 hover:text-brand-600">← 문의 목록</Link>

      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">{ticket.subject}</h1>
        <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
          {STATUS_LABEL[ticket.status]}
        </span>
      </div>
      <p className="text-xs text-gray-500 font-mono mt-1">{ticket.ticketNo}</p>

      <div className="mt-6 space-y-3">
        {ticket.messages.map((m) => {
          const mine = m.authorType === "CUSTOMER";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-md rounded-lg p-3 ${mine ? "bg-brand-50 text-brand-900" : "bg-gray-100 text-gray-800"}`}>
                <div className="text-[10px] text-gray-500 mb-1">
                  {m.authorName} · {m.createdAt.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
                </div>
                <div className="text-sm whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          );
        })}
      </div>

      {ticket.status !== "CLOSED" && (
        <div className="mt-6">
          <ReplyForm ticketId={ticket.id} />
        </div>
      )}
    </div>
  );
}
