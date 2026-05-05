import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPhone } from "@/lib/crypto";
import { consumeVerification } from "@/lib/identity-verification";
import { createPasswordResetToken } from "@/lib/password-reset";
import { getClientInfo, rateLimitAsync } from "@/lib/security";

/**
 * POST /api/auth/find-password/by-pass
 * Body: { verificationId: string, identifier: string }   // identifier = username | email
 *
 * 본인인증으로 신원 확인 + 사용자가 입력한 아이디(또는 이메일)와 매칭되는 회원 1명에게
 * 비밀번호 재설정 토큰 발급. 토큰은 응답으로 직접 반환 (PASS 인증을 통과했으므로
 * 메일 발송 단계 생략 가능).
 *
 * 이메일/아이디 enumeration 방어:
 *  - 일치하지 않으면 동일한 모양의 응답({ ok: true, resetToken: null })을 돌려주지 않고,
 *    "본인인증 정보와 일치하는 계정이 없습니다" 명시 (PASS 통과 자체가 강한 본인 증명이므로
 *    이 경로는 enumeration 위험이 낮음)
 */

const Schema = z.object({
  verificationId: z.string().min(1).max(100),
  identifier: z.string().min(4).max(320),
});

export async function POST(req: NextRequest) {
  const { ip, userAgent } = getClientInfo(req);
  const rl = await rateLimitAsync(`find-pw:${ip || "anon"}`, 10, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }

  try {
    const { verificationId, identifier } = Schema.parse(await req.json());

    const consume = await consumeVerification(verificationId);
    if (!consume.ok) {
      return NextResponse.json({ error: consume.error }, { status: 400 });
    }
    const v = consume.data;
    if (v.purpose !== "find-password") {
      return NextResponse.json({ error: "용도가 일치하지 않는 인증입니다." }, { status: 400 });
    }

    const idLower = identifier.trim().toLowerCase();
    const isEmail = idLower.includes("@");

    const user = isEmail
      ? await prisma.user.findUnique({ where: { email: idLower } })
      : await prisma.user.findUnique({ where: { username: idLower } });

    if (!user || user.status === "WITHDRAWN") {
      return NextResponse.json({ error: "입력한 아이디 또는 이메일로 가입된 회원이 없습니다." }, { status: 404 });
    }

    // 본인인증 신원과 회원 정보 일치 검증
    let matched = false;
    if (user.ci && user.ci === v.ci) {
      matched = true;
    } else {
      // ci 미보유 회원: 이름 + 휴대폰 해시 일치
      const phoneHash = hashPhone(v.phone.replace(/\D/g, ""));
      if (user.name === v.name && user.phoneHash === phoneHash) {
        matched = true;
      }
    }
    if (!matched) {
      return NextResponse.json(
        { error: "본인인증 정보와 회원 정보가 일치하지 않습니다." },
        { status: 403 }
      );
    }

    // ci 가 비어있던 회원이면 이번 기회에 백필
    if (!user.ci) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { ci: v.ci, di: v.di, identityVerifiedAt: new Date(), identityProvider: v.provider },
        });
      } catch { /* 다른 회원이 같은 ci 로 백필 시도시 unique 충돌 — 무시 */ }
    }

    // 재설정 토큰 발급 (1시간 유효, 1회용)
    const resetToken = await createPasswordResetToken({ userId: user.id, ip, userAgent });

    return NextResponse.json({ ok: true, resetToken });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e?.message || "비밀번호 찾기 실패" }, { status: 500 });
  }
}
