import crypto from "node:crypto";

/**
 * AES-256-GCM 양방향 암호화 + SHA-256 단방향 해시
 *
 * 환경변수 ENCRYPTION_KEY 는 32 바이트(64자 hex). 회전 시 KEK→DEK 패턴 권장.
 * 환경 무관 필수: 미설정/형식 오류시 무조건 throw.
 * (이전 더미 fallback("0".repeat(64))는 운영 NODE_ENV 누락시 모든 PII 평문 복구 위험으로 제거됨)
 */

const KEY_HEX = process.env.ENCRYPTION_KEY;

function getKey(): Buffer {
  if (!KEY_HEX) {
    throw new Error(
      "ENCRYPTION_KEY 환경변수가 설정되지 않았습니다. " +
      "32 바이트(64자 hex) 문자열을 지정하세요. " +
      "예: openssl rand -hex 32"
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(KEY_HEX)) {
    throw new Error("ENCRYPTION_KEY 형식 오류: 64자 hex 문자열이어야 합니다.");
  }
  return Buffer.from(KEY_HEX, "hex");
}

/** 평문 → "v1.<iv_hex>.<authTag_hex>.<cipher_hex>" */
export function encrypt(plain: string): string {
  if (!plain) return "";
  const iv = crypto.randomBytes(12); // GCM 권장: 96-bit IV
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

/** 암호문 → 평문 (실패시 throw) */
export function decrypt(payload: string): string {
  if (!payload) return "";
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("잘못된 암호문 형식");
  }
  const [, ivHex, tagHex, dataHex] = parts;
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** 안전하게 복호화 (실패시 null) */
export function tryDecrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try { return decrypt(payload); } catch { return null; }
}

/**
 * 검색용 단방향 해시 (HMAC-SHA-256)
 * - 키가 없으면 해시 충돌 공격 방어 안 됨 → 검색 정확도 우선
 * - 같은 입력 → 같은 출력 보장하므로 인덱스로 동등 검색 가능
 */
export function hash(value: string): string {
  if (!value) return "";
  const key = getKey();
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

/** 휴대폰 정규화 + 해시 */
export function hashPhone(phone: string): string {
  const normalized = (phone || "").replace(/[^0-9]/g, "");
  return hash(normalized);
}

/** 평문 → 마스킹 (010-****-1234) */
export function maskPhone(phone: string): string {
  const n = (phone || "").replace(/[^0-9]/g, "");
  if (n.length < 10) return phone;
  return `${n.slice(0, 3)}-****-${n.slice(-4)}`;
}
