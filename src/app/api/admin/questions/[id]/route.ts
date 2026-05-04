import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertStaffApi } from "@/lib/admin-guard";

const Schema = z.object({
  answer: z.string().min(2).max(2000).optional(),
  isHidden: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await assertStaffApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const data = Schema.parse(await req.json());
    const update: any = {};
    if (data.answer !== undefined) {
      update.answer = data.answer;
      update.answeredAt = new Date();
      update.answeredBy = guard.session.user.id;
    }
    if (data.isHidden !== undefined) update.isHidden = data.isHidden;

    const updated = await prisma.productQuestion.update({ where: { id: params.id }, data: update });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === "P2025") return NextResponse.json({ error: "Q&A를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await assertStaffApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  await prisma.productQuestion.delete({ where: { id: params.id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
