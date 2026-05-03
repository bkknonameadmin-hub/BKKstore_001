import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { assertAdminApi } from "@/lib/admin-guard";
import { logger } from "@/lib/logger";

/**
 * Sentry 연동 검증용 테스트 엔드포인트
 *
 * GET /api/admin/sentry-test?type=message  → 메시지 전송
 * GET /api/admin/sentry-test?type=error    → 에러 캡쳐
 * GET /api/admin/sentry-test?type=throw    → throw (글로벌 핸들러 캡쳐)
 * GET /api/admin/sentry-test?type=logger   → logger.error 통한 캡쳐
 */
export async function GET(req: NextRequest) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const type = req.nextUrl.searchParams.get("type") || "message";
  const dsnConfigured = !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

  if (type === "message") {
    const id = Sentry.captureMessage("[테스트] Sentry 메시지 정상 수신", "info");
    return NextResponse.json({ ok: true, type, dsnConfigured, eventId: id });
  }

  if (type === "error") {
    const id = Sentry.captureException(new Error("[테스트] 의도적 에러 캡쳐"));
    return NextResponse.json({ ok: true, type, dsnConfigured, eventId: id });
  }

  if (type === "logger") {
    logger.error("[테스트] logger.error → Sentry 자동 전파", {
      adminEmail: guard.session.user.email,
      error: new Error("logger context error"),
    });
    return NextResponse.json({ ok: true, type, dsnConfigured });
  }

  if (type === "throw") {
    // 글로벌 핸들러로 이동 — Sentry onRequestError 가 자동 캡쳐
    throw new Error("[테스트] throw 된 에러 — onRequestError 가 캡쳐");
  }

  return NextResponse.json({ error: "type 은 message|error|throw|logger" }, { status: 400 });
}
