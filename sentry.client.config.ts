/**
 * Sentry 클라이언트(브라우저) 초기화
 * Next.js 가 자동으로 로드 (sentry.client.config.ts → instrumentation-client)
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    // 성능 모니터링 — 트래픽이 많아지면 0.1 정도로 낮추기
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // 세션 리플레이 — 에러 발생 세션만 100% 기록
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,        // PII 보호
        blockAllMedia: true,
      }),
    ],

    // 무시할 에러 (의미 없는 노이즈)
    ignoreErrors: [
      "Network Error",
      "Failed to fetch",
      "Load failed",
      "ResizeObserver loop limit exceeded",
      "ChunkLoadError",
      // NextAuth 정상 동작 중 발생하는 known errors
      "CredentialsSignin",
    ],

    beforeSend(event, hint) {
      // 개발모드에서도 콘솔에 띄워서 확인
      if (process.env.NODE_ENV === "development") {
        console.warn("[sentry/client]", hint?.originalException || event);
      }
      return event;
    },
  });
}
