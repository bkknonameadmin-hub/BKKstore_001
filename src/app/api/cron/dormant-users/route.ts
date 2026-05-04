import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeCron } from "@/lib/cron-auth";

/**
 * 1년 미접속 회원 → 휴면 전환 (개인정보보호법)
 * 5년 이상 휴면 + 미사용 → 자동 파기 처리 (선택적)
 *
 * 호출: GET /api/cron/dormant-users  (헤더: x-cron-token: ${CRON_SECRET})
 * 권장 주기: 1일 1회
 */

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const FIVE_YEARS_MS = 5 * ONE_YEAR_MS;

export async function GET(req: NextRequest) {
  const auth = authorizeCron(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const now = new Date();
  const dormantThreshold = new Date(now.getTime() - ONE_YEAR_MS);
  const purgeThreshold = new Date(now.getTime() - FIVE_YEARS_MS);

  // 1) ACTIVE → DORMANT 전환
  const dormantResult = await prisma.user.updateMany({
    where: {
      status: "ACTIVE",
      OR: [
        { lastLoginAt: { lt: dormantThreshold } },
        { lastLoginAt: null, createdAt: { lt: dormantThreshold } },
      ],
    },
    data: {
      status: "DORMANT",
      dormantAt: now,
    },
  });

  // 2) 5년 이상 DORMANT/WITHDRAWN → 개인정보 파기 (PII 마스킹)
  const purgeTargets = await prisma.user.findMany({
    where: {
      OR: [
        { status: "DORMANT", dormantAt: { lt: purgeThreshold } },
        { status: "WITHDRAWN", withdrawnAt: { lt: purgeThreshold } },
      ],
    },
    select: { id: true },
    take: 500,
  });

  for (const u of purgeTargets) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        email: `purged_${u.id}@example.invalid`,
        name: "(파기)",
        phone: null,
        phoneEnc: null,
        phoneHash: null,
        image: null,
        passwordHash: null,
      },
    });
    // 주소도 모두 삭제
    await prisma.address.deleteMany({ where: { userId: u.id } });
  }

  return NextResponse.json({
    ok: true,
    dormantConverted: dormantResult.count,
    purged: purgeTargets.length,
  });
}

export const POST = GET;
