import { NextRequest, NextResponse } from "next/server";
import { getIdentityProvider } from "@/lib/identity-verification";
import { logger } from "@/lib/logger";

/**
 * GET / POST /api/auth/identity/return
 *
 * 본인확인기관(또는 mock 폼)이 인증 완료 후 호출하는 콜백 엔드포인트.
 * - NICE: POST formData (EncodeData)
 * - KCB: GET query
 * - mock: GET query (reqSeq, name, birthDate, phone, gender)
 *
 * 처리 결과에 따라 적절한 페이지로 리다이렉트:
 * - 성공: /identity/complete?vid={verificationId}  (클라이언트가 sessionStorage 에 저장)
 * - 실패: /identity/failed?reason=...
 */

async function handle(req: NextRequest, method: "GET" | "POST") {
  const provider = getIdentityProvider();

  // 쿼리 + 바디 동시에 추출
  const query: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => { query[k] = v; });

  let body: Record<string, string> = {};
  if (method === "POST") {
    const ct = req.headers.get("content-type") || "";
    try {
      if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
        const fd = await req.formData();
        fd.forEach((v, k) => { body[k] = String(v); });
      } else if (ct.includes("application/json")) {
        body = await req.json();
      }
    } catch (e: any) {
      logger.warn("identity.return.body_parse", { error: e?.message });
    }
  }

  let result;
  try {
    result = await provider.handleReturn({ method, query, body });
  } catch (e: any) {
    logger.error("identity.return.error", { error: e?.message });
    return NextResponse.redirect(new URL(`/identity/failed?reason=${encodeURIComponent(e?.message || "internal")}`, req.url));
  }

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/identity/failed?reason=${encodeURIComponent(result.error)}`, req.url));
  }

  // 성공 — 클라이언트가 vid 를 받아 다음 단계로 진행
  return NextResponse.redirect(new URL(`/identity/complete?vid=${result.verificationId}`, req.url));
}

export async function GET(req: NextRequest) { return handle(req, "GET"); }
export async function POST(req: NextRequest) { return handle(req, "POST"); }
