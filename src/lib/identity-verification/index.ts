import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type {
  IdentityProvider,
  IdentityProviderName,
  IdentityPurpose,
  CompletedVerification,
} from "./types";
import { mockProvider } from "./mock";
import { niceProvider } from "./nice";

export type { IdentityProvider, IdentityPurpose, CompletedVerification, StartResult } from "./types";

/**
 * IDENTITY_PROVIDER 환경변수로 어댑터 선택.
 * - 'nice' / 'kcb' / 'kcp' / 'mock' (default: mock)
 * - 운영에서 'mock' 이면 부팅 시 경고
 */
const PROVIDER_NAME = (process.env.IDENTITY_PROVIDER || "mock").toLowerCase() as IdentityProviderName;

if (process.env.NODE_ENV === "production" && PROVIDER_NAME === "mock") {
  logger.warn("identity.provider.mock_in_prod", {
    warn: "IDENTITY_PROVIDER=mock 이 운영 환경에서 사용되고 있습니다. 본인확인기관 계약 후 nice/kcb/kcp 로 변경하세요.",
  });
}

let _cachedProvider: IdentityProvider | null = null;
let _activeName: IdentityProviderName = "mock";

function selectProvider(): IdentityProvider {
  if (_cachedProvider) return _cachedProvider;
  switch (PROVIDER_NAME) {
    case "nice":
      _cachedProvider = niceProvider;
      _activeName = "nice";
      break;
    case "mock":
    default:
      _cachedProvider = mockProvider;
      _activeName = "mock";
      break;
  }
  return _cachedProvider;
}

/** 현재 활성 provider 객체 반환 */
export function getIdentityProvider(): IdentityProvider {
  return selectProvider();
}

/** 현재 활성 provider 이름 (UI 분기용) */
export function getActiveProviderName(): IdentityProviderName {
  selectProvider();
  return _activeName;
}

/**
 * 완료된 인증 레코드 조회 (1회 사용 처리 포함)
 *
 * - status 가 COMPLETED 여야 함
 * - consumedAt 이 null 이어야 함 (재사용 방지)
 * - expiresAt 이 미래여야 함
 *
 * 호출 직후 자동으로 consumedAt 마킹 → 동일 verificationId 재사용 차단.
 */
export async function consumeVerification(
  verificationId: string
): Promise<{ ok: true; data: CompletedVerification } | { ok: false; error: string }> {
  const record = await prisma.identityVerification.findUnique({ where: { id: verificationId } });
  if (!record) return { ok: false, error: "유효하지 않은 인증입니다." };
  if (record.status !== "COMPLETED") return { ok: false, error: "완료되지 않은 인증입니다." };
  if (record.consumedAt) return { ok: false, error: "이미 사용된 인증입니다." };
  if (record.expiresAt < new Date()) {
    await prisma.identityVerification.update({
      where: { id: record.id },
      data: { status: "EXPIRED", failReason: "expired_on_consume" },
    });
    return { ok: false, error: "인증 시간이 만료되었습니다." };
  }
  if (!record.ci || !record.name || !record.birthDate || !record.phone) {
    return { ok: false, error: "본인인증 데이터가 불완전합니다." };
  }

  // 1회 사용 마킹
  await prisma.identityVerification.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return {
    ok: true,
    data: {
      id: record.id,
      reqSeq: record.reqSeq,
      provider: record.provider as IdentityProviderName,
      purpose: record.purpose as IdentityPurpose,
      ci: record.ci,
      di: record.di || "",
      name: record.name,
      birthDate: record.birthDate,
      phone: record.phone,
      gender: (record.gender as "M" | "F") ?? null,
      nationality: (record.nationality as "L" | "F") ?? null,
    },
  };
}

/**
 * 만료된 인증 일괄 정리 (cron cleanup 에서 호출)
 */
export async function cleanupExpiredVerifications(): Promise<number> {
  const r = await prisma.identityVerification.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() }, status: { in: ["PENDING", "EXPIRED", "FAILED"] } },
        { consumedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // 사용 후 24h 이상
      ],
    },
  });
  return r.count;
}
