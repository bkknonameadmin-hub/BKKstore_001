import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateUsernameFormat, normalizeUsername } from "@/lib/username";
import { getClientInfo, rateLimitAsync } from "@/lib/security";

/**
 * GET /api/auth/check-username?u=foobar
 * → { available: boolean, reason?: string }
 *
 * 회원가입 폼의 [중복확인] 버튼 / 디바운스 자동 체크에서 호출.
 * IP당 분당 30회 제한 (스크래핑·전수조사 방어).
 */
export async function GET(req: NextRequest) {
  const { ip } = getClientInfo(req);
  const rl = await rateLimitAsync(`check-username:${ip || "anon"}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ available: false, reason: "요청이 너무 많습니다." }, { status: 429 });
  }

  const raw = req.nextUrl.searchParams.get("u") || "";
  const parsed = z.string().min(1).max(40).safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ available: false, reason: "잘못된 요청입니다." }, { status: 400 });
  }

  const fmt = validateUsernameFormat(parsed.data);
  if (!fmt.ok) {
    return NextResponse.json({ available: false, reason: fmt.reason });
  }

  const username = normalizeUsername(parsed.data);
  const exists = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (exists) {
    return NextResponse.json({ available: false, reason: "이미 사용 중인 아이디입니다." });
  }

  return NextResponse.json({ available: true });
}
