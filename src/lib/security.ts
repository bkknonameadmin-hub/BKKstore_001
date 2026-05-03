import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";

/**
 * 비밀번호 강도 정책
 * - 12자 이상
 * - 대문자, 소문자, 숫자, 특수문자 중 3가지 이상 포함
 * - 흔한 약한 비밀번호 거부
 */
const COMMON_WEAK = new Set([
  "password", "12345678", "qwertyuiop", "00000000", "11111111",
  "asdfgh1234", "fishingmall", "letmein123", "welcome1234",
]);

export type PasswordCheck = { ok: boolean; reason?: string };

export function checkPasswordStrength(pw: string): PasswordCheck {
  if (!pw || pw.length < 12) return { ok: false, reason: "비밀번호는 12자 이상이어야 합니다." };
  if (pw.length > 128) return { ok: false, reason: "비밀번호가 너무 깁니다." };

  if (COMMON_WEAK.has(pw.toLowerCase())) {
    return { ok: false, reason: "추측하기 쉬운 비밀번호입니다." };
  }

  let groups = 0;
  if (/[a-z]/.test(pw)) groups++;
  if (/[A-Z]/.test(pw)) groups++;
  if (/[0-9]/.test(pw)) groups++;
  if (/[^A-Za-z0-9]/.test(pw)) groups++;
  if (groups < 3) return { ok: false, reason: "대문자, 소문자, 숫자, 특수문자 중 3가지 이상을 조합해주세요." };

  // 같은 문자 반복 (예: aaaaaaaa) 방지
  if (/(.)\1{4,}/.test(pw)) return { ok: false, reason: "동일 문자를 5번 이상 연속할 수 없습니다." };

  return { ok: true };
}

type HeaderLike =
  | Headers
  | { get?: (k: string) => string | null | undefined; [k: string]: any };

function readHeader(h: HeaderLike, key: string): string | null {
  if (!h) return null;
  if (typeof (h as Headers).get === "function") {
    return (h as Headers).get(key) ?? null;
  }
  // NextAuth authorize req.headers 는 plain object (lowercase 키)
  const v = (h as any)[key.toLowerCase()] ?? (h as any)[key];
  if (Array.isArray(v)) return v[0] ?? null;
  return typeof v === "string" ? v : null;
}

/**
 * 클라이언트 IP / User-Agent 추출
 * - NextRequest, headers() 결과, 또는 NextAuth authorize 의 req.headers (plain obj) 모두 지원
 */
export function getClientInfo(reqOrHeaders?: NextRequest | HeaderLike): { ip: string | null; userAgent: string | null } {
  // 1. 명시적으로 전달된 객체 사용
  if (reqOrHeaders) {
    const h: HeaderLike =
      "headers" in (reqOrHeaders as any) && (reqOrHeaders as any).headers
        ? (reqOrHeaders as any).headers
        : (reqOrHeaders as HeaderLike);
    const ip =
      (readHeader(h, "x-forwarded-for")?.split(",")[0]?.trim()) ||
      readHeader(h, "x-real-ip") ||
      readHeader(h, "cf-connecting-ip") ||
      null;
    const userAgent = readHeader(h, "user-agent");
    return { ip, userAgent };
  }

  // 2. RSC / Route Handler 컨텍스트
  try {
    const h = headers();
    return {
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim()
        || h.get("x-real-ip")
        || h.get("cf-connecting-ip")
        || null,
      userAgent: h.get("user-agent"),
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/** 로그인 시도 기록 */
export async function logLoginAttempt(args: {
  email: string;
  userId: string | null;
  success: boolean;
  reason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  await prisma.loginLog.create({
    data: {
      email: args.email.toLowerCase().slice(0, 320),
      userId: args.userId,
      success: args.success,
      reason: args.reason || null,
      ip: args.ip || null,
      userAgent: args.userAgent?.slice(0, 500) || null,
    },
  }).catch(() => {/* 로그 실패는 무시 */});
}

/**
 * 레이트 리밋: 동일 이메일 또는 IP 의 최근 N분 동안 실패 횟수 체크
 * 임계 도달시 일시 잠금
 */
const WINDOW_MS = 10 * 60 * 1000; // 10분
const MAX_FAILS_PER_EMAIL = 5;
const MAX_FAILS_PER_IP = 20;

export async function isLoginBlocked(email: string, ip: string | null): Promise<{ blocked: boolean; retryAfterSec?: number }> {
  const since = new Date(Date.now() - WINDOW_MS);

  const [emailFails, ipFails] = await Promise.all([
    prisma.loginLog.count({
      where: { email: email.toLowerCase(), success: false, createdAt: { gte: since } },
    }),
    ip ? prisma.loginLog.count({
      where: { ip, success: false, createdAt: { gte: since } },
    }) : 0,
  ]);

  if (emailFails >= MAX_FAILS_PER_EMAIL) {
    return { blocked: true, retryAfterSec: Math.ceil(WINDOW_MS / 1000) };
  }
  if (ip && ipFails >= MAX_FAILS_PER_IP) {
    return { blocked: true, retryAfterSec: Math.ceil(WINDOW_MS / 1000) };
  }
  return { blocked: false };
}

/**
 * 일반 API 레이트 리밋
 * - Redis 사용시: 분산 환경에서도 정확한 카운트 (INCR + EXPIRE 원자 처리)
 * - Redis 미설정시: 인메모리 폴백 (단일 인스턴스 한정)
 *
 * 동기 + 비동기 모두 지원하기 위해 동기 버전(in-memory) 과 async 버전 분리
 */
import { getRedis } from "@/lib/redis";

const buckets = new Map<string, { count: number; resetAt: number }>();

/** 동기 버전 — 인메모리만 사용 (즉시 결과 필요한 곳에서) */
export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.count >= max) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}

/** 비동기 분산 버전 — Redis 있으면 분산, 없으면 인메모리 폴백 */
export async function rateLimitAsync(key: string, max: number, windowMs: number): Promise<{ ok: boolean; retryAfterSec?: number; current?: number }> {
  const r = getRedis();
  if (!r) return rateLimit(key, max, windowMs);

  const redisKey = `rl:${key}`;
  try {
    // INCR + EXPIRE 원자적 처리 (multi)
    const pipeline = r.multi();
    pipeline.incr(redisKey);
    pipeline.pttl(redisKey);
    const results = await pipeline.exec();
    if (!results) return { ok: true };

    const count = results[0][1] as number;
    let ttl = results[1][1] as number;

    // 첫 호출이면 TTL 설정
    if (ttl === -1 || ttl === -2) {
      await r.pexpire(redisKey, windowMs);
      ttl = windowMs;
    }

    if (count > max) {
      return { ok: false, retryAfterSec: Math.ceil(ttl / 1000), current: count };
    }
    return { ok: true, current: count };
  } catch (e) {
    // Redis 일시 장애 시 인메모리 폴백
    return rateLimit(key, max, windowMs);
  }
}
