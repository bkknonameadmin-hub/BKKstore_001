import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { IdentityProvider, StartResult } from "./types";
import { defaultExpiresAt, generateReqSeq } from "./util";

/**
 * NICE 평가정보 본인확인 (체크플러스 / 캡차 SDK)
 *
 * 운영 도입 절차:
 * 1. https://www.niceid.co.kr 가입 + 본인확인 서비스 신청 (영업일 1~2주)
 * 2. 사이트코드(SITE_CODE) + 사이트패스워드(SITE_PASSWORD) 발급
 * 3. .env 에 다음 입력:
 *      NICE_SITE_CODE=...
 *      NICE_SITE_PASSWORD=...
 *      IDENTITY_PROVIDER=nice
 * 4. NICE 가 제공하는 SEED 암호화 모듈 (Node native addon) 별도 설치 필요
 *      → 그동안은 이 파일의 `encryptSeed` / `decryptSeed` 가 throw 함
 *
 * 인증창 호출 형식:
 *  - 새창(Popup) 으로 https://nice.checkplus.co.kr/CheckPlusSafeModel/checkplus.cb 호출
 *  - POST 형식, hidden field "EncodeData" 전달
 *  - 인증 완료 후 우리 returnUrl 로 EncodeData(success) 또는 ErrorCode(fail) 가 POST 됨
 *
 * 본 어댑터는 NICE 모듈 결합 전까지 부팅 시 logger.warn 로 경고만 띄우고
 * 호출 시 명시적 에러를 발생시켜 fallback 으로 mock 으로 가도록 합니다.
 */

const SITE_CODE = process.env.NICE_SITE_CODE || "";
const SITE_PASSWORD = process.env.NICE_SITE_PASSWORD || "";
const NICE_BASE_URL = "https://nice.checkplus.co.kr/CheckPlusSafeModel/checkplus.cb";

function isConfigured(): boolean {
  return !!(SITE_CODE && SITE_PASSWORD);
}

/**
 * NICE SEED 암호화 — 실제 모듈 결합 필요.
 * NICE 가 제공하는 SEED128/SEED-CBC 라이브러리를 별도 설치한 뒤 import 해서 호출.
 *
 * 모듈 미설치 상태에서 호출되면 명시적 에러 → 어댑터가 자동으로 mock 폴백.
 */
function encryptSeed(_plain: string): string {
  throw new Error(
    "[nice] SEED 암호화 모듈이 결합되지 않았습니다. " +
    "NICE 평가정보에서 제공하는 NIDModule(Node native addon) 설치 후 " +
    "src/lib/identity-verification/nice.ts 의 encryptSeed/decryptSeed 를 구현하세요."
  );
}

function decryptSeed(_enc: string): string {
  throw new Error("[nice] SEED 복호화 모듈이 결합되지 않았습니다.");
}

export const niceProvider: IdentityProvider = {
  name: "nice",

  async start({ purpose, returnUrl, ip, userAgent }) {
    if (!isConfigured()) {
      throw new Error("[nice] NICE_SITE_CODE / NICE_SITE_PASSWORD 가 설정되지 않았습니다.");
    }

    const reqSeq = generateReqSeq();
    const record = await prisma.identityVerification.create({
      data: {
        reqSeq,
        provider: "nice",
        purpose,
        status: "PENDING",
        expiresAt: defaultExpiresAt(),
        ip,
        userAgent: userAgent?.slice(0, 500) || null,
      },
    });

    // NICE 평문 데이터 (key=value 8개 항목 \n 으로 구분)
    const plain = [
      `7:REQ_SEQ${reqSeq.length}:${reqSeq}`,
      `7:SITECODE${SITE_CODE.length}:${SITE_CODE}`,
      `9:AUTH_TYPE0:`,                            // 빈값 = 통합인증창
      `7:RTN_URL${returnUrl.length}:${returnUrl}`,
      `8:GENDER0:`,
      `8:RECEIVE0:`,
    ].join("");

    let encData: string;
    try {
      encData = encryptSeed(plain); // ← 운영 도입시 NICE 모듈 호출
    } catch (e: any) {
      logger.warn("nice.encrypt.failed", { error: e?.message });
      throw new Error("NICE 본인확인 모듈이 결합되지 않았습니다. mock 으로 폴백됩니다.");
    }

    return {
      verificationId: record.id,
      reqSeq,
      mode: "popup",
      url: NICE_BASE_URL,
      formData: { m: "checkplusService", EncodeData: encData },
    } satisfies StartResult;
  },

  async handleReturn({ method, query, body }) {
    const data = method === "POST" ? (body || {}) : query;
    const encData = data.EncodeData || data.encodeData;

    if (!encData) {
      return { ok: false, error: "EncodeData 가 없습니다." };
    }

    let decoded: string;
    try {
      decoded = decryptSeed(encData);
    } catch (e: any) {
      logger.error("nice.decrypt.failed", { error: e?.message });
      return { ok: false, error: "응답 복호화 실패" };
    }

    // NICE 응답 파싱: "fieldLen:NAMElen:VALUE" 형식 반복
    const fields: Record<string, string> = {};
    let i = 0;
    while (i < decoded.length) {
      const colonA = decoded.indexOf(":", i);
      if (colonA < 0) break;
      const nameLen = parseInt(decoded.slice(i, colonA), 10);
      const name = decoded.slice(colonA + 1, colonA + 1 + nameLen);
      const after = colonA + 1 + nameLen;
      const colonB = decoded.indexOf(":", after);
      if (colonB < 0) break;
      const valueLen = parseInt(decoded.slice(after, colonB), 10);
      const value = decoded.slice(colonB + 1, colonB + 1 + valueLen);
      fields[name.trim()] = value;
      i = colonB + 1 + valueLen;
    }

    const reqSeq = fields["REQ_SEQ"];
    if (!reqSeq) return { ok: false, error: "REQ_SEQ 누락" };

    const record = await prisma.identityVerification.findUnique({ where: { reqSeq } });
    if (!record) return { ok: false, error: "유효하지 않은 reqSeq" };
    if (record.status !== "PENDING") {
      return { ok: false, error: `이미 처리된 인증 (${record.status})`, verificationId: record.id };
    }

    const updated = await prisma.identityVerification.update({
      where: { id: record.id },
      data: {
        status: "COMPLETED",
        ci: fields["CI"] || null,
        di: fields["DI"] || null,
        name: fields["NAME"] || null,
        birthDate: fields["BIRTHDATE"] || null,
        phone: fields["MOBILE_NO"] || null,
        gender: fields["GENDER"] === "1" ? "M" : fields["GENDER"] === "0" ? "F" : null,
        nationality: fields["NATIONALINFO"] === "1" ? "L" : "F",
      },
    });

    return { ok: true, verificationId: updated.id };
  },
};
