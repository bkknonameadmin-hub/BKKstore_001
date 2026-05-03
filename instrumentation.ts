/**
 * Next.js 14 instrumentation hook
 * - 서버 부팅 시 한 번 호출되어 Sentry 를 초기화
 * - Edge / Node 런타임에 따라 적절한 config 선택
 * - next.config 에 `experimental.instrumentationHook: true` 또는 Next 14.2+ 자동 인식
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Next 15+ 표준 — 라우트 핸들러/RSC 에서 throw 된 에러를 Sentry 로 전송
 * Sentry v10 export: captureRequestError → onRequestError 로 노출
 */
export { captureRequestError as onRequestError } from "@sentry/nextjs";
