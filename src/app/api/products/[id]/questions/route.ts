import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientInfo } from "@/lib/security";

/**
 * 상품 Q&A
 * GET  /api/products/[id]/questions   — 공개 + 본인 비공개
 * POST /api/products/[id]/questions   — 회원만 등록 (간소화)
 */

const CreateSchema = z.object({
  question: z.string().min(5).max(2000),
  isPrivate: z.boolean().default(false),
});

function maskName(name: string): string {
  if (!name) return "익명";
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  const items = await prisma.productQuestion.findMany({
    where: { productId: params.id, isHidden: false },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true } } },
  });

  // 비공개 글은 작성자 본인 + 관리자만 내용 노출
  const masked = items.map((q) => {
    const isOwner = userId && q.userId === userId;
    const hidden = q.isPrivate && !isOwner;
    return {
      id: q.id,
      authorName: maskName(q.user?.name || q.authorName),
      isPrivate: q.isPrivate,
      question: hidden ? "(비공개 문의입니다)" : q.question,
      answer: hidden ? null : q.answer,
      answeredAt: q.answeredAt,
      createdAt: q.createdAt,
      isOwner: !!isOwner,
    };
  });

  return NextResponse.json(masked);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { ip } = getClientInfo(req);
  const rl = rateLimit(`q-create:${userId}:${ip || ""}`, 10, 10 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 429 });

  try {
    const data = CreateSchema.parse(await req.json());
    const product = await prisma.product.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!product) return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    const created = await prisma.productQuestion.create({
      data: {
        userId,
        productId: params.id,
        authorName: user?.name || "회원",
        question: data.question,
        isPrivate: data.isPrivate,
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
