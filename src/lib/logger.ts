/**
 * 구조화 로거
 * - 운영시 외부 로그 시스템(Datadog/Logtail/CloudWatch) 연결 추천
 * - JSON 라인 출력으로 grep/parse 용이
 * - error 레벨은 Sentry 로 자동 전송 (DSN 설정 시)
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === "production" ? "info" : "debug");

let _sentry: typeof import("@sentry/nextjs") | null | undefined;
async function getSentry() {
  if (_sentry !== undefined) return _sentry;
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    _sentry = null;
    return null;
  }
  try {
    _sentry = await import("@sentry/nextjs");
  } catch {
    _sentry = null;
  }
  return _sentry;
}

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
    const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : level === "debug" ? "🔍" : "ℹ️";
    fn(`${prefix} [${level}] ${message}`, ctx || "");
  }

  // Sentry 전파 (warn 은 breadcrumb, error 는 capture)
  if (level === "error" || level === "warn") {
    void getSentry().then((s) => {
      if (!s) return;
      const err = ctx?.error;
      if (level === "error") {
        if (err instanceof Error) {
          s.captureException(err, { extra: { message, ...ctx } });
        } else {
          s.captureMessage(message, { level: "error", extra: ctx });
        }
      } else {
        s.addBreadcrumb({ level: "warning", message, data: ctx });
      }
    }).catch(() => {});
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

/** 로그인 사용자 컨텍스트를 Sentry 에 전파 */
export async function setSentryUser(user: { id: string; email?: string | null; role?: string | null } | null) {
  const s = await getSentry();
  if (!s) return;
  if (!user) {
    s.setUser(null);
    return;
  }
  // PII 보호: id 는 hash 없이도 추적 가능, email 은 운영 정책에 따라 마스킹
  s.setUser({
    id: user.id,
    email: process.env.SENTRY_INCLUDE_PII === "true" ? user.email || undefined : undefined,
    role: user.role || undefined,
  } as any);
}
