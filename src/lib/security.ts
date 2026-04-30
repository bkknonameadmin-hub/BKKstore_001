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

/** 클라이언트 IP / User-Agent 추출 (요청 컨텍스트에서) */
export function getClientInfo(req?: NextRequest): { ip: string | null; userAgent: string | null } {
  if (req) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || null;
    const userAgent = req.headers.get("user-agent");
    return { ip, userAgent };
  }
  // RSC / Route Handler 등에서 NextRequest 객체가 없는 경우
  try {
    const h = headers();
    return {
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null,
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

/** 일반 API 레이트 리밋용 인메모리 카운터 (단일 프로세스 한정 - 운영시 Redis 권장) */
const buckets = new Map<string, { count: number; resetAt: number }>();

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
