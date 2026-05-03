import { getRedis } from "@/lib/redis";

/**
 * 일반 캐시 헬퍼 (JSON 직렬화)
 * - Redis 미설정시 인메모리 폴백 (단일 인스턴스 한정)
 * - TTL 단위: 초
 */

const memoryCache = new Map<string, { value: any; expiresAt: number }>();

function memGet<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function memSet(key: string, value: any, ttlSec: number) {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
  // 인메모리 누수 방지: 1000개 이상이면 만료된 것 청소
  if (memoryCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of memoryCache) {
      if (v.expiresAt < now) memoryCache.delete(k);
    }
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return memGet<T>(key);
  try {
    const raw = await r.get(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: any, ttlSec: number): Promise<void> {
  const r = getRedis();
  if (!r) return memSet(key, value, ttlSec);
  try {
    await r.set(key, JSON.stringify(value), "EX", ttlSec);
  } catch {
    memSet(key, value, ttlSec);
  }
}

export async function cacheDel(key: string): Promise<void> {
  const r = getRedis();
  if (r) {
    try { await r.del(key); } catch {}
  }
  memoryCache.delete(key);
}

/** 패턴 매칭 무효화 (와일드카드: prefix*) */
export async function cacheDelPattern(pattern: string): Promise<number> {
  const r = getRedis();
  if (r) {
    try {
      let cursor = "0";
      let total = 0;
      do {
        const [next, keys] = await r.scan(cursor, "MATCH", pattern, "COUNT", 200);
        cursor = next;
        if (keys.length > 0) {
          await r.del(...keys);
          total += keys.length;
        }
      } while (cursor !== "0");
      return total;
    } catch { return 0; }
  }
  // 인메모리: prefix 매칭
  const prefix = pattern.replace(/\*$/, "");
  let count = 0;
  for (const k of memoryCache.keys()) {
    if (k.startsWith(prefix)) { memoryCache.delete(k); count++; }
  }
  return count;
}

/** 캐시 또는 함수 실행 결과 (memoize) */
export async function cacheOr<T>(key: string, ttlSec: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await fetcher();
  await cacheSet(key, value, ttlSec);
  return value;
}
