import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync, getClientInfo } from "@/lib/security";
import { createPasswordResetToken, sendResetEmail } from "@/lib/password-reset";
import { logger } from "@/lib/logger";

/**
 * 비밀번호 재설정 메일 발송.
 * - 회원 존재 여부는 응답에 노출하지 않음 (enumeration 방어)
 * - 동일 이메일/IP 단위 rate limit
 */

const Schema = z.object({
  email: z.string().email().max(320),
});

export async function POST(req: NextRequest) {
  try {
    const data = Schema.parse(await req.json());
    const email = data.email.toLowerCase().trim();
    const { ip, userAgent } = getClientInfo(req);

    // Rate limit: 이메일 1시간 5회, IP 1시간 20회
    const r1 = await rateLimitAsync(`pwreset:email:${email}`, 5, 60 * 60_000);
    const r2 = await rateLimitAsync(`pwreset:ip:${ip || "anon"}`, 20, 60 * 60_000);
    if (!r1.ok || !r2.ok) {
      return NextResponse.json({ ok: true }); // 응답은 동일하게 (enumeration 방어)
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.passwordHash && user.status !== "WITHDRAWN") {
      const token = await createPasswordResetToken({ userId: user.id, ip, userAgent });
      const r = await sendResetEmail(email, token);
      if (!r.ok) {
        logger.error("forgot-password.email_failed", { email, error: r.error });
      } else {
        logger.info("forgot-password.email_sent", { userId: user.id });
      }
    } else {
      logger.info("forgot-password.no_eligible_user", { email });
    }

    // 항상 성공 응답 (enumeration 방어)
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    }
    return NextResponse.json({ error: "처리 실패" }, { status: 400 });
  }
}
