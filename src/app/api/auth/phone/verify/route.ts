import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidKrPhone, normalizePhone } from "@/lib/sms";

const Schema = z.object({
  phone: z.string().min(10).max(20),
  code: z.string().regex(/^\d{6}$/, "6자리 숫자를 입력해주세요."),
});

const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { phone: raw, code } = Schema.parse(await req.json());
    if (!isValidKrPhone(raw)) {
      return NextResponse.json({ error: "올바른 휴대폰 번호가 아닙니다." }, { status: 400 });
    }
    const phone = normalizePhone(raw);

    // 가장 최근에 발급된 미사용 코드 조회
    const record = await prisma.phoneVerification.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!record) {
      return NextResponse.json({ error: "인증코드가 없거나 만료되었습니다. 다시 요청해주세요." }, { status: 400 });
    }

    // 시도 횟수 초과
    if (record.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: "시도 횟수를 초과했습니다. 새 코드를 요청해주세요." }, { status: 429 });
    }

    // 코드 비교
    if (record.codeHash !== hashCode(code)) {
      await prisma.phoneVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ error: "인증번호가 일치하지 않습니다." }, { status: 400 });
    }

    // 코드 사용 처리
    await prisma.phoneVerification.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });

    // 로그인된 회원이면 phoneVerifiedAt 업데이트
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { phone, phoneVerifiedAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true, phone, verifiedToken: record.id });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "인증 실패" }, { status: 400 });
  }
}
