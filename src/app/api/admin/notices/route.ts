import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertAdminApi } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

const noticeSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(20000),
  category: z.enum(["IMPORTANT", "EVENT", "GENERAL"]),
  isPinned: z.boolean(),
  isPublished: z.boolean(),
});

export async function POST(req: NextRequest) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }
  const parsed = noticeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "입력 검증 실패", details: parsed.error.flatten() }, { status: 400 });

  const created = await prisma.notice.create({
    data: { ...parsed.data, createdBy: guard.session.user.email, publishedAt: new Date() },
  });
  return NextResponse.json({ id: created.id });
}
