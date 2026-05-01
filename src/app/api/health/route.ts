import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  // 환경변수 체크 (필수 키만)
  checks.env = {
    ok: !!process.env.DATABASE_URL && !!process.env.NEXTAUTH_SECRET,
    error:
      !process.env.DATABASE_URL ? "DATABASE_URL 미설정" :
      !process.env.NEXTAUTH_SECRET ? "NEXTAUTH_SECRET 미설정" : undefined,
  };

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      ok: allOk,
      service: "fishing-mall",
      time: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
