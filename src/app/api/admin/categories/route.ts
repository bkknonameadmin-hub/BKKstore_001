import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdminApi } from "@/lib/admin-guard";

const Schema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "영문소문자/숫자/하이픈만 허용됩니다."),
  name: z.string().min(1),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const items = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const data = Schema.parse(await req.json());
    const dup = await prisma.category.findUnique({ where: { slug: data.slug } });
    if (dup) return NextResponse.json({ error: "이미 존재하는 slug 입니다." }, { status: 409 });

    const created = await prisma.category.create({
      data: {
        slug: data.slug,
        name: data.name,
        parentId: data.parentId || null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "생성 실패" }, { status: 400 });
  }
}
