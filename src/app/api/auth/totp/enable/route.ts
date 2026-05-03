import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTotp, encryptTotpSecret, generateBackupCodes, hashBackupCodes } from "@/lib/totp";

const Schema = z.object({
  secret: z.string().min(10),
  code: z.string().regex(/^\d{6}$/),
});

/**
 * TOTP 활성화 — secret + 6자리 코드를 받아 검증 후 저장
 * 백업 코드 10개 함께 발급 (1회용)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const userId = (session.user as any).id as string;

  try {
    const { secret, code } = Schema.parse(await req.json());
    if (!verifyTotp(code, secret)) {
      return NextResponse.json({ error: "코드가 일치하지 않습니다." }, { status: 400 });
    }

    const backupCodes = generateBackupCodes(10);
    const hashed = await hashBackupCodes(backupCodes);

    await prisma.user.update({
      where: { id: userId },
      data: {
        totpSecretEnc: encryptTotpSecret(secret),
        totpEnabled: true,
        totpEnabledAt: new Date(),
        totpBackupCodes: hashed,
      },
    });

    // 백업 코드는 활성화 직후 한 번만 평문으로 응답 (회원이 저장)
    return NextResponse.json({ ok: true, backupCodes });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
