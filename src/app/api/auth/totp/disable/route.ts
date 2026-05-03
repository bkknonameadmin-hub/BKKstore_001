import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Schema = z.object({ password: z.string().min(1) });

/**
 * TOTP 비활성화 — 비밀번호 재인증 필수
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const userId = (session.user as any).id as string;

  try {
    const { password } = Schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "소셜 계정은 별도 처리 필요" }, { status: 400 });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 400 });

    await prisma.user.update({
      where: { id: userId },
      data: {
        totpSecretEnc: null,
        totpEnabled: false,
        totpEnabledAt: null,
        totpBackupCodes: [],
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
