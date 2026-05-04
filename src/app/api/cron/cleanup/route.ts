import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeCron } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

/**
 * 보존기간 만료 데이터 일괄 정리.
 *
 * 호출:
 *   GET /api/cron/cleanup  (헤더: x-cron-token 또는 Authorization: Bearer)
 *   권장: 1일 1회
 *
 * 정리 대상:
 *   - PhoneVerification: 24시간 경과한 모든 코드 (consumed/만료 무관)
 *   - PasswordResetToken: 7일 경과
 *   - IdempotencyKey: expiresAt < now
 *   - LoginLog: 180일 경과 (감사용 보존)
 *   - DataExportRequest: expiresAt < now
 */

const ONE_DAY = 24 * 60 * 60 * 1000;
const SEVEN_DAYS = 7 * ONE_DAY;
const LOGIN_LOG_RETENTION_DAYS = parseInt(process.env.LOGIN_LOG_RETENTION_DAYS || "180", 10);

export async function GET(req: NextRequest) {
  const auth = authorizeCron(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - ONE_DAY);
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS);
  const loginLogCutoff = new Date(now.getTime() - LOGIN_LOG_RETENTION_DAYS * ONE_DAY);

  const results: Record<string, number> = {};
  const errors: Record<string, string> = {};

  async function safe(name: string, fn: () => Promise<{ count: number }>) {
    try {
      const r = await fn();
      results[name] = r.count;
    } catch (e: any) {
      errors[name] = e?.message || String(e);
    }
  }

  await safe("phoneVerification", () =>
    prisma.phoneVerification.deleteMany({ where: { createdAt: { lt: oneDayAgo } } })
  );

  await safe("passwordResetToken", () =>
    prisma.passwordResetToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: now } }, { createdAt: { lt: sevenDaysAgo } }] },
    })
  );

  await safe("idempotencyKey", () =>
    prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lt: now } } })
  );

  await safe("loginLog", () =>
    prisma.loginLog.deleteMany({ where: { createdAt: { lt: loginLogCutoff } } })
  );

  await safe("dataExportRequest", () =>
    prisma.dataExportRequest.deleteMany({
      where: { expiresAt: { lt: now }, status: { in: ["READY", "FAILED", "EXPIRED"] } },
    })
  );

  logger.info("cron.cleanup", { results, errors });
  return NextResponse.json({ ok: true, results, errors });
}

export const POST = GET;
