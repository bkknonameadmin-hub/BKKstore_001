import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertAdminApi } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  role: z.enum(["CUSTOMER", "CS_AGENT", "ADMIN", "SUPER_ADMIN"]),
  status: z.enum(["ACTIVE", "DORMANT", "WITHDRAWN", "SUSPENDED"]),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "입력 검증 실패" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });

  // SUPER_ADMIN 은 SUPER_ADMIN 만 변경 가능 (자기 자신 좌천 방지 등)
  const actor = await prisma.user.findUnique({ where: { id: guard.session.user.id } });
  if (target.role === "SUPER_ADMIN" && actor?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "SUPER_ADMIN 권한은 SUPER_ADMIN 만 변경할 수 있습니다." }, { status: 403 });
  }
  if (parsed.data.role === "SUPER_ADMIN" && actor?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "SUPER_ADMIN 부여는 SUPER_ADMIN 만 가능합니다." }, { status: 403 });
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { role: parsed.data.role, status: parsed.data.status },
  });

  // AuditLog 기록
  await prisma.auditLog.create({
    data: {
      actorId: guard.session.user.id,
      actorEmail: guard.session.user.email,
      action: "user.role_change",
      targetType: "User",
      targetId: params.id,
      metadata: {
        before: { role: target.role, status: target.status },
        after: { role: parsed.data.role, status: parsed.data.status },
      },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, role: updated.role, status: updated.status });
}
