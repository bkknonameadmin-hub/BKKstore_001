import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerifyEmail, consumeEmailVerifyToken } from "@/lib/email-verify";
import { rateLimit, getClientInfo } from "@/lib/security";

/**
 * GET  /api/auth/verify-email?token=...  → 토큰 검증 + emailVerified 업데이트
 * POST /api/auth/verify-email            → 인증메일 재발송 (로그인 회원)
 */

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token 누락" }, { status: 400 });

  const result = await consumeEmailVerifyToken(token);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, email: result.email });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { ip } = getClientInfo(req);
  const rl = rateLimit(`email-verify-send:${userId}:${ip || ""}`, 3, 10 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "10분에 3회만 가능합니다." }, { status: 429 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, emailVerified: true } });
  if (!user) return NextResponse.json({ error: "회원 없음" }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ error: "이미 인증된 이메일입니다." }, { status: 400 });

  const r = await sendVerifyEmail(user.email, user.name);
  if (r.ok) {
    await prisma.user.update({ where: { id: userId }, data: { emailVerifySentAt: new Date() } });
  }
  return NextResponse.json(r);
}
