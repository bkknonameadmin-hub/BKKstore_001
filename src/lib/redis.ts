import IORedis, { Redis } from "ioredis";

/**
 * Redis 싱글턴 클라이언트
 * - REDIS_URL 미설정시 null 반환 (호출측이 폴백 처리)
 * - dev 환경의 hot reload 에서도 단일 커넥션 유지
 */

const globalForRedis = globalThis as unknown as { redis?: Redis | null };

export function getRedis(): Redis | null {
  if (globalForRedis.redis !== undefined) return globalForRedis.redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[redis] REDIS_URL 미설정 — Redis 의존 기능은 폴백으로 동작");
    }
    globalForRedis.redis = null;
    return null;
  }

  try {
    const client = new IORedis(url, {
      maxRetriesPerRequest: null,    // BullMQ 호환을 위해 필수
      enableReadyCheck: true,
      lazyConnect: false,
      reconnectOnError: (err) => {
        const targetError = "READONLY";
        if (err.message.includes(targetError)) return true;
        return false;
      },
    });
    client.on("error", (err) => console.error("[redis] error", err.message));
    globalForRedis.redis = client;
    return client;
  } catch (e) {
    console.error("[redis] 연결 실패", e);
    globalForRedis.redis = null;
    return null;
  }
}

export function isRedisAvailable(): boolean {
  return getRedis() !== null;
}

/** 운영시 graceful shutdown */
export async function disconnectRedis(): Promise<void> {
  const r = globalForRedis.redis;
  if (r) {
    await r.quit().catch(() => {});
    globalForRedis.redis = null;
  }
}
