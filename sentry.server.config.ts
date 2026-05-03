/**
 * Sentry 서버(Node.js) 초기화
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV || process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,

    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // 보안: 요청 데이터 일부 마스킹
    sendDefaultPii: false,

    integrations: [
      // Prisma 쿼리 트레이싱 (자동)
      Sentry.prismaIntegration(),
    ],

    ignoreErrors: [
      "OutOfStockError",      // 비즈니스 로직 — 알림 불필요
      "P2025",                // Prisma "Record not found" — 흔한 케이스
    ],

    beforeSend(event, hint) {
      // 민감 헤더 제거
      if (event.request?.headers) {
        delete (event.request.headers as any).cookie;
        delete (event.request.headers as any).authorization;
        delete (event.request.headers as any)["x-cron-token"];
      }
      // 민감 쿼리 파라미터 마스킹 (token 류)
      if (event.request?.query_string) {
        event.request.query_string = String(event.request.query_string)
          .replace(/(token|secret|key)=[^&]+/gi, "$1=***");
      }
      if (process.env.NODE_ENV === "development") {
        console.warn("[sentry/server]", hint?.originalException || event.message);
      }
      return event;
    },
  });
}
