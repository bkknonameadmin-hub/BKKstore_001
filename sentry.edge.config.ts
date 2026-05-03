/**
 * Sentry Edge Runtime 초기화 (middleware.ts, edge route 용)
 * Node API 미사용 — Sentry Edge SDK 사용
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV || process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,
    sendDefaultPii: false,
  });
}
