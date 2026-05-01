import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPasswordStrength, getClientInfo, logLoginAttempt } from "@/lib/security";

const Schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const userId = (session.user as any).id as string;

  try {
    const data = Schema.parse(await req.json());

    if (data.currentPassword === data.newPassword) {
      return NextResponse.json({ error: "기존 비밀번호와 동일합니다." }, { status: 400 });
    }

    const strength = checkPasswordStrength(data.newPassword);
    if (!strength.ok) return NextResponse.json({ error: strength.reason }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

    // 소셜로 가입한 회원은 비밀번호가 없음 → 변경 불가
    if (!user.passwordHash) {
      return NextResponse.json({
        error: "소셜 계정으로 가입한 회원은 비밀번호를 설정할 수 없습니다. 해당 SNS의 보안 설정을 이용해주세요.",
      }, { status: 400 });
    }

    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) {
      const { ip, userAgent } = getClientInfo(req);
      await logLoginAttempt({
        email: user.email, userId: user.id, success: false,
        reason: "wrong_password_change", ip, userAgent,
      });
      return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 400 });
    }

    const newHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, passwordChangedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "변경 실패" }, { status: 400 });
  }
}
