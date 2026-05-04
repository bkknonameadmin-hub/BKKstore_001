import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync, getClientInfo, checkPasswordStrength } from "@/lib/security";
import { consumePasswordResetToken, markPasswordResetTokenUsed } from "@/lib/password-reset";
import { logger } from "@/lib/logger";

const Schema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(12).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const data = Schema.parse(await req.json());
    const { ip } = getClientInfo(req);

    // Rate limit: token 시도, IP 단위
    const r1 = await rateLimitAsync(`pwreset:consume:${data.token.slice(0, 16)}`, 5, 10 * 60_000);
    const r2 = await rateLimitAsync(`pwreset:consume:ip:${ip || "anon"}`, 20, 60 * 60_000);
    if (!r1.ok || !r2.ok) {
      return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
    }

    const strength = checkPasswordStrength(data.password);
    if (!strength.ok) {
      return NextResponse.json({ error: strength.reason }, { status: 400 });
    }

    const consumed = await consumePasswordResetToken(data.token);
    if (!consumed.ok) {
      return NextResponse.json({ error: consumed.error }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: consumed.userId },
        data: { passwordHash, passwordChangedAt: new Date() },
      }),
      // 다른 활성 reset 토큰도 모두 무효화
      prisma.passwordResetToken.updateMany({
        where: { userId: consumed.userId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
    ]);

    // 일관성 위해 명시 호출 (consumePasswordResetToken은 검증만, 위 트랜잭션의 updateMany가 표시 처리)
    await markPasswordResetTokenUsed(data.token).catch(() => {});

    logger.info("reset-password.completed", { userId: consumed.userId });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    }
    return NextResponse.json({ error: "처리 실패" }, { status: 400 });
  }
}
