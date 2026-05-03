/**
 * Next.js 14 instrumentation hook
 * - 서버 부팅 시 한 번 호출되어 Sentry 초기화
 * - 개발 환경에서는 BullMQ 워커도 같은 프로세스에서 자동 시작
 *   (운영 환경은 scripts/worker.ts 별도 프로세스 권장)
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");

    // 개발 환경 + DISABLE_INPROCESS_WORKER 미설정 시 워커 자동 시작
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.DISABLE_INPROCESS_WORKER !== "true"
    ) {
      const { startWorkers } = await import("./src/lib/workers");
      startWorkers();
    }
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
