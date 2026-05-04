/**
 * 로그인 아이디(username) 정책
 * - 4~20자
 * - 첫 글자: 영소문자
 * - 이후: 영소문자/숫자/언더스코어
 * - 대소문자 구분 안 함 → 항상 소문자로 정규화 후 저장/조회
 * - 예약어 차단 (admin, root, support 등)
 */

const MIN = 4;
const MAX = 20;
const PATTERN = /^[a-z][a-z0-9_]{3,19}$/; // 4~20자, 첫 글자 영문

const RESERVED = new Set<string>([
  "admin", "administrator", "root", "system", "superuser",
  "support", "help", "info", "contact", "service",
  "test", "demo", "guest", "user", "anonymous",
  "naver", "kakao", "google", "facebook", "twitter",
  "fishingmall", "official", "staff", "manager", "moderator",
  "null", "undefined", "true", "false",
  "api", "auth", "login", "register", "logout",
  "me", "you", "owner", "ceo", "master",
]);

export type UsernameCheck = { ok: boolean; reason?: string };

/** 형식만 검증 (네트워크/DB 조회 X) */
export function validateUsernameFormat(input: string): UsernameCheck {
  if (!input) return { ok: false, reason: "아이디를 입력해주세요." };
  const u = input.trim().toLowerCase();
  if (u.length < MIN) return { ok: false, reason: `아이디는 ${MIN}자 이상이어야 합니다.` };
  if (u.length > MAX) return { ok: false, reason: `아이디는 ${MAX}자 이하여야 합니다.` };
  if (!PATTERN.test(u)) {
    return { ok: false, reason: "영문 소문자로 시작, 영소문자/숫자/언더스코어만 사용 가능합니다." };
  }
  if (RESERVED.has(u)) return { ok: false, reason: "사용할 수 없는 아이디입니다." };
  // 연속 언더스코어 금지
  if (/__+/.test(u)) return { ok: false, reason: "언더스코어를 연속 사용할 수 없습니다." };
  // 끝이 언더스코어 금지
  if (u.endsWith("_")) return { ok: false, reason: "아이디는 언더스코어로 끝날 수 없습니다." };
  return { ok: true };
}

/** 입력값을 소문자/trim 정규화 (저장·조회 직전에 적용) */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}
