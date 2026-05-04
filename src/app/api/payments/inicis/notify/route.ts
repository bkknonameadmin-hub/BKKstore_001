import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { restoreOrderStock } from "@/lib/stock";
import { logger } from "@/lib/logger";

/**
 * KG이니시스 Noti URL (서버 통보)
 * 결제창에서 사용자가 닫거나 네트워크 끊겨도 PG가 별도로 호출하여 결제 결과 통보
 *
 * 이니시스 가맹점 관리자에서 등록: 노티 URL = {NEXTAUTH_URL}/api/payments/inicis/notify
 *
 * 보안:
 * - INICIS_SIGN_KEY 미설정시 무조건 503 (운영/개발 무관)
 * - 노티 페이로드의 signature/verification 필드 또는 hashData 를 SHA-256 으로 재계산하여 검증
 * - 선택: INICIS_NOTIFY_ALLOWED_IPS (콤마 구분) — IP allowlist
 */

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function timingEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function getClientIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    null
  );
}

/**
 * 이니시스 노티 서명 검증.
 * 노티 종류에 따라 필드명이 다르므로 가능한 조합을 모두 시도.
 *  - 결제승인 통보: signature = sha256("authToken=...&timestamp=...")
 *  - 취소 통보:    hashData  = sha256("INIAPIKey + type + timestamp + ...")
 *  - 공통: verification = sha256("oid + price + signKey + timestamp")
 */
function verifyInicisNotify(params: Record<string, string>, signKey: string): boolean {
  const oid = params.oid || params.MOID || "";
  const price = params.price || params.TotPrice || "";
  const timestamp = params.timestamp || "";

  // 1) verification 필드 (가장 일반적인 통보 검증값)
  if (params.verification && oid && price && timestamp) {
    const expected = sha256Hex(`oid=${oid}&price=${price}&signKey=${signKey}&timestamp=${timestamp}`);
    if (timingEq(expected, params.verification)) return true;
  }

  // 2) signature 필드 (authToken 기반 통보)
  if (params.signature && params.authToken && timestamp) {
    const expected = sha256Hex(`authToken=${params.authToken}&signKey=${signKey}&timestamp=${timestamp}`);
    if (timingEq(expected, params.signature)) return true;
  }

  // 3) hashData (INIAPIKey 기반 — 일부 취소 통보)
  if (params.hashData && params.type && timestamp) {
    const apiKey = process.env.INICIS_API_KEY || signKey;
    const expected = sha256Hex(`${apiKey}${params.type}${timestamp}${oid}`);
    if (timingEq(expected, params.hashData)) return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  // 시크릿 강제: 환경 무관
  const signKey = process.env.INICIS_SIGN_KEY;
  if (!signKey) {
    logger.error("inicis.notify.no_signkey", {});
    return new NextResponse("FAIL", { status: 503 });
  }

  // (선택) IP allowlist
  const allowed = (process.env.INICIS_NOTIFY_ALLOWED_IPS || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length > 0) {
    const ip = getClientIp(req);
    if (!ip || !allowed.includes(ip)) {
      logger.warn("inicis.notify.ip_blocked", { ip });
      return new NextResponse("FAIL", { status: 401 });
    }
  }

  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((v, k) => { params[k] = String(v); });

  // 서명 검증
  if (!verifyInicisNotify(params, signKey)) {
    logger.warn("inicis.notify.signature_invalid", {
      oid: params.oid || params.MOID,
      keys: Object.keys(params).join(","),
    });
    return new NextResponse("FAIL", { status: 401 });
  }

  const oid = params.oid || params.MOID;
  const tid = params.tid || params.TID;
  const resultCode = params.resultCode || params.ResultCode;
  const cancelDate = params.cancelDate;

  if (!oid) return new NextResponse("OK", { status: 200 });

  const order = await prisma.order.findUnique({ where: { orderNo: oid } });
  if (!order) return new NextResponse("OK", { status: 200 });

  try {
    if (resultCode === "00" && cancelDate) {
      if (order.status === "CANCELLED" || order.status === "REFUNDED") {
        return new NextResponse("OK", { status: 200 });
      }
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", cancelledAt: new Date(), providerTxnId: tid || order.providerTxnId },
      });
      if (order.paidAt) await restoreOrderStock(order.id);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (e: any) {
    logger.error("inicis.notify.failed", { oid, error: e?.message });
    return new NextResponse("FAIL", { status: 500 });
  }
}
