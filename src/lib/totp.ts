// otplib v12 는 default export 형태 — require 로 안전하게 가져옴
// eslint-disable-next-line @typescript-eslint/no-var-requires
const otplib = require("otplib");
const authenticator: any = otplib.authenticator;
import qrcode from "qrcode";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { encrypt, decrypt } from "@/lib/crypto";

/**
 * TOTP 2단계 인증 (Google Authenticator / Authy 등 호환)
 * - secret 은 AES-256-GCM 암호화하여 DB 저장
 * - 백업 코드 8자리 영숫자, bcrypt 해시 (1회 사용)
 */

authenticator.options = {
  window: 1,        // 이전/현재/다음 30초 윈도우 허용
  step: 30,
};

const ISSUER = process.env.NEXT_PUBLIC_BUSINESS_NAME || "낚시몰";

export function generateTotpSecret(email: string) {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(email, ISSUER, secret);
  return { secret, otpauth };
}

export async function generateQrDataUrl(otpauth: string): Promise<string> {
  return qrcode.toDataURL(otpauth, { width: 240, margin: 1 });
}

/** 코드 검증 */
export function verifyTotp(code: string, secret: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  try {
    return authenticator.verify({ token: code, secret });
  } catch { return false; }
}

/** DB 저장용 암호화 */
export function encryptTotpSecret(secret: string): string {
  return encrypt(secret);
}
export function decryptTotpSecret(enc: string): string {
  return decrypt(enc);
}

/* ==== 백업 코드 ==== */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    // XXXX-XXXX 포맷
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => bcrypt.hash(c.toUpperCase(), 8)));
}

/** 백업 코드 검증 — 일치하는 해시 인덱스 반환 (-1 = 불일치) */
export async function verifyBackupCode(input: string, hashes: string[]): Promise<number> {
  const normalized = input.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const formatted = `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}`;
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(formatted, hashes[i])) return i;
  }
  return -1;
}
