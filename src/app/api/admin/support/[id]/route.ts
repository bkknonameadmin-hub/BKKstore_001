import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdminApi } from "@/lib/admin-guard";

const Schema = z.object({
  content: z.string().min(1).max(5000).optional(),
  status: z.enum(["OPEN", "PENDING", "ANSWERED", "CLOSED"]).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      user: { select: { id: true, email: true, name: true } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ticket);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const data = Schema.parse(await req.json());
    const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ops: any[] = [];
    if (data.content) {
      ops.push(
        prisma.supportMessage.create({
          data: {
            ticketId: ticket.id,
            authorType: "ADMIN",
            authorId: guard.session.user.id,
            authorName: "관리자",
            content: data.content,
          },
        })
      );
    }
    const newStatus = data.status || (data.content ? "ANSWERED" : ticket.status);
    ops.push(
      prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: newStatus,
          lastMessageAt: new Date(),
          closedAt: newStatus === "CLOSED" ? new Date() : null,
        },
      })
    );
    await prisma.$transaction(ops);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
