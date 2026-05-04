import type { NextRequest } from "next/server";
import crypto from "node:crypto";

/**
 * Cron 라우트 인증.
 * - CRON_SECRET 미설정시 환경 무관 거부 (운영 누락 방어)
 * - 헤더 `x-cron-token`, Authorization Bearer, 또는 query `?token=` 허용 (Vercel Cron 호환)
 * - timing-safe 비교
 */
export function authorizeCron(req: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { ok: false, status: 503, error: "CRON_SECRET 미설정" };
  }

  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const token =
    bearer ||
    req.headers.get("x-cron-token") ||
    req.nextUrl.searchParams.get("token") ||
    "";

  if (!token) return { ok: false, status: 401, error: "missing token" };

  try {
    const a = Buffer.from(token);
    const b = Buffer.from(secret);
    if (a.length !== b.length) return { ok: false, status: 403, error: "forbidden" };
    if (!crypto.timingSafeEqual(a, b)) return { ok: false, status: 403, error: "forbidden" };
  } catch {
    return { ok: false, status: 403, error: "forbidden" };
  }
  return { ok: true };
}
