/**
 * 구조화 로거
 * - 운영시 외부 로그 시스템(Datadog/Logtail/CloudWatch) 연결 추천
 * - JSON 라인 출력으로 grep/parse 용이
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === "production" ? "info" : "debug");

function emit(level: LogLevel, message: string, ctx?: LogContext) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[MIN_LEVEL]) return;
  const line = {
    t: new Date().toISOString(),
    lv: level,
    msg: message,
    ...ctx,
  };
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (process.env.NODE_ENV === "production") {
    fn(JSON.stringify(line));
  } else {
    // 개발 환경: 가독성 좋은 출력
    const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : level === "debug" ? "🔍" : "ℹ️";
    fn(`${prefix} [${level}] ${message}`, ctx || "");
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => emit("debug", msg, ctx),
  info: (msg: string, ctx?: LogContext) => emit("info", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => emit("warn", msg, ctx),
  error: (msg: string, ctx?: LogContext) => emit("error", msg, ctx),
  /** 자식 로거 (모든 호출에 추가 context) */
  child: (extra: LogContext) => ({
    debug: (m: string, c?: LogContext) => emit("debug", m, { ...extra, ...c }),
    info:  (m: string, c?: LogContext) => emit("info",  m, { ...extra, ...c }),
    warn:  (m: string, c?: LogContext) => emit("warn",  m, { ...extra, ...c }),
    error: (m: string, c?: LogContext) => emit("error", m, { ...extra, ...c }),
  }),
};
