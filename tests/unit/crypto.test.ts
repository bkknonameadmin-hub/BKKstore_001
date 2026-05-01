import { describe, it, expect, beforeAll } from "vitest";

// 테스트 전 환경변수 세팅
beforeAll(() => {
  process.env.ENCRYPTION_KEY = "0".repeat(64);
});

describe("crypto", () => {
  it("encrypt → decrypt 라운드트립", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const plain = "01012345678";
    const encrypted = encrypt(plain);
    expect(encrypted).not.toBe(plain);
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(decrypt(encrypted)).toBe(plain);
  });

  it("동일 입력에 대해 매번 다른 암호문 (IV 랜덤)", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const a = encrypt("hello");
    const b = encrypt("hello");
    expect(a).not.toBe(b);
  });

  it("hash: 같은 입력 → 같은 출력 (검색 가능)", async () => {
    const { hash } = await import("@/lib/crypto");
    expect(hash("01012345678")).toBe(hash("01012345678"));
    expect(hash("01012345678")).not.toBe(hash("01012345679"));
  });

  it("hashPhone: 정규화된 입력으로 해시", async () => {
    const { hashPhone } = await import("@/lib/crypto");
    expect(hashPhone("010-1234-5678")).toBe(hashPhone("01012345678"));
  });

  it("maskPhone: 가운데 4자리 마스킹", async () => {
    const { maskPhone } = await import("@/lib/crypto");
    expect(maskPhone("01012345678")).toBe("010-****-5678");
    expect(maskPhone("010-1234-5678")).toBe("010-****-5678");
  });

  it("decrypt: 잘못된 암호문 → throw", async () => {
    const { decrypt } = await import("@/lib/crypto");
    expect(() => decrypt("invalid")).toThrow();
  });
});
