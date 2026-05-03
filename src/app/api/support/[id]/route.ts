import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ReplySchema = z.object({ content: z.string().min(1).max(5000) });

/** 회원 본인 티켓 조회 + 추가 답글 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const userId = (session.user as any).id as string;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket || ticket.userId !== userId) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  return NextResponse.json(ticket);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const userId = (session.user as any).id as string;

  try {
    const { content } = ReplySchema.parse(await req.json());
    const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
    if (!ticket || ticket.userId !== userId) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }
    if (ticket.status === "CLOSED") {
      return NextResponse.json({ error: "종료된 티켓입니다." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    await prisma.$transaction([
      prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          authorType: "CUSTOMER",
          authorId: userId,
          authorName: user?.name || "회원",
          content,
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "OPEN", lastMessageAt: new Date() },
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
