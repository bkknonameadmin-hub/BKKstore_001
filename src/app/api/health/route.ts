import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { queueStats } from "@/lib/queue";

/**
 * Health check
 * - GET /api/health (간단 체크)
 * - GET /api/health?deep=1 (DB/외부 의존성 포함 검사)
 *
 * 운영시 UptimeRobot/Vercel Cron 등에서 1분 간격 호출
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const deep = url.searchParams.get("deep") === "1";

  if (!deep) {
    return NextResponse.json({
      ok: true,
      service: "fishing-mall",
      time: new Date().toISOString(),
    });
  }

  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  // DB 연결 체크
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (e: any) {
    checks.database = { ok: false, error: e.message };
  }

  // Redis 연결 체크 (선택적 — 미설정 OK)
  const redis = getRedis();
  if (redis) {
    const redisStart = Date.now();
    try {
      const pong = await redis.ping();
      checks.redis = { ok: pong === "PONG", latencyMs: Date.now() - redisStart };
    } catch (e: any) {
      checks.redis = { ok: false, error: e.message };
    }
  } else {
    checks.redis = { ok: true, error: "not configured (using in-memory fallback)" };
  }

  // 큐 상태
  let queue: any;
  try {
    queue = await queueStats();
  } catch (e: any) {
    queue = { error: e.message };
  }

  // 환경변수 체크 (필수 키만)
  checks.env = {
    ok: !!process.env.DATABASE_URL && !!process.env.NEXTAUTH_SECRET,
    error:
      !process.env.DATABASE_URL ? "DATABASE_URL 미설정" :
      !process.env.NEXTAUTH_SECRET ? "NEXTAUTH_SECRET 미설정" : undefined,
  };

  // Redis 미설정은 ok 로 간주 (선택 의존성)
  const criticalChecks = { database: checks.database, env: checks.env };
  const allOk = Object.values(criticalChecks).every((c) => c.ok);

  return NextResponse.json(
    {
      ok: allOk,
      service: "fishing-mall",
      time: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      queue,
    },
    { status: allOk ? 200 : 503 }
  );
}
