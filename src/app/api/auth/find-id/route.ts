import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPhone } from "@/lib/crypto";
import { consumeVerification } from "@/lib/identity-verification";
import { maskUsername, maskEmail } from "@/lib/identity-verification/util";
import { getClientInfo, rateLimitAsync } from "@/lib/security";

/**
 * POST /api/auth/find-id
 * Body: { verificationId: string }
 *
 * 본인인증(consumeVerification) → CI 또는 (이름+휴대폰해시) 매칭 → username 마스킹 노출
 *
 * 응답:
 *  { ok: true, accounts: [{ usernameMasked, emailMasked, createdAt }] }
 *  또는
 *  { ok: false, error: "..." }
 *  또는
 *  { ok: true, accounts: [] }  ← 회원 존재 안 함 (enumeration 방어를 위해 동일 응답 형태)
 */

const Schema = z.object({
  verificationId: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  const { ip } = getClientInfo(req);
  const rl = await rateLimitAsync(`find-id:${ip || "anon"}`, 10, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }

  try {
    const { verificationId } = Schema.parse(await req.json());

    const consume = await consumeVerification(verificationId);
    if (!consume.ok) {
      return NextResponse.json({ error: consume.error }, { status: 400 });
    }
    const v = consume.data;
    if (v.purpose !== "find-id") {
      return NextResponse.json({ error: "용도가 일치하지 않는 인증입니다." }, { status: 400 });
    }

    // 1차 매칭: ci 일치
    let users = await prisma.user.findMany({
      where: { ci: v.ci, status: { notIn: ["WITHDRAWN"] } },
      select: { username: true, email: true, createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    });

    // 2차 매칭: ci 미보유 회원이라도 휴대폰 해시 + 이름 일치
    if (users.length === 0) {
      const phoneHash = hashPhone(v.phone.replace(/\D/g, ""));
      const candidates = await prisma.user.findMany({
        where: {
          phoneHash,
          name: v.name,
          status: { notIn: ["WITHDRAWN"] },
        },
        select: { username: true, email: true, createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      });
      users = candidates;
    }

    const accounts = users.map((u) => ({
      usernameMasked: u.username ? maskUsername(u.username) : null,
      emailMasked: maskEmail(u.email),
      createdAt: u.createdAt.toISOString(),
      hasUsername: !!u.username,
    }));

    return NextResponse.json({ ok: true, accounts });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e?.message || "아이디 찾기 실패" }, { status: 500 });
  }
}
