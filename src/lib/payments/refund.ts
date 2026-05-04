/**
 * PG사별 결제 취소(환불) 호출.
 *
 * - Toss: POST /v1/payments/{paymentKey}/cancel  (Authorization: Basic base64(secret:))
 * - INICIS: 가맹점 INIAPI 또는 콘솔 — 자동화 가능 형태로 wrap
 * - NaverPay: POST /v1/cancel
 *
 * 모든 함수는 성공시 { ok: true, raw }, 실패시 { ok: false, error, raw } 반환.
 */
import crypto from "node:crypto";

type CancelResult = { ok: boolean; error?: string; raw?: any };

export async function cancelTossPayment(args: {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number; // 부분 환불시 지정
  refundReceiveAccount?: { bank: string; accountNumber: string; holderName: string };
}): Promise<CancelResult> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "TOSS_SECRET_KEY 미설정" };

  const basicAuth = Buffer.from(secretKey + ":").toString("base64");
  const body: Record<string, any> = { cancelReason: args.cancelReason };
  if (args.cancelAmount && args.cancelAmount > 0) body.cancelAmount = args.cancelAmount;
  if (args.refundReceiveAccount) body.refundReceiveAccount = args.refundReceiveAccount;

  try {
    const res = await fetch(`https://api.tosspayments.com/v1/payments/${args.paymentKey}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `refund-${args.paymentKey}-${Date.now()}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json?.message || `HTTP ${res.status}`, raw: json };
    }
    return { ok: true, raw: json };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Toss 환불 호출 실패" };
  }
}

export async function cancelInicisPayment(args: {
  tid: string;
  cancelReason: string;
  cancelAmount?: number;
}): Promise<CancelResult> {
  const mid = process.env.INICIS_MID;
  const apiKey = process.env.INICIS_API_KEY;
  const apiPwd = process.env.INICIS_API_PWD;
  if (!mid || !apiKey || !apiPwd) {
    return { ok: false, error: "INICIS_MID/API_KEY/API_PWD 미설정" };
  }

  const timestamp = Date.now().toString();
  const type = args.cancelAmount ? "PartialRefund" : "Refund";
  const data = {
    tid: args.tid,
    msg: args.cancelReason,
    ...(args.cancelAmount ? { confirmPrice: String(args.cancelAmount) } : {}),
  };
  const dataStr = JSON.stringify(data);
  // INICIS INIAPI 표준: hashData = sha512(apiKey + type + timestamp + dataStr)
  const hashData = crypto.createHash("sha512")
    .update(`${apiKey}${type}${timestamp}${dataStr}`).digest("hex");

  const body = new URLSearchParams({
    mid,
    type,
    paymethod: "Card",
    timestamp,
    clientIp: "0.0.0.0",
    hashData,
    data: dataStr,
  });

  try {
    const res = await fetch("https://iniapi.inicis.com/api/v1/refund", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = await res.json().catch(() => ({}));
    if (json?.resultCode !== "00") {
      return { ok: false, error: json?.resultMsg || `HTTP ${res.status}`, raw: json };
    }
    return { ok: true, raw: json };
  } catch (e: any) {
    return { ok: false, error: e?.message || "INICIS 환불 호출 실패" };
  }
}

export async function cancelNaverPayment(args: {
  paymentId: string;
  cancelReason: string;
  cancelAmount: number;
  taxScopeAmount?: number;
}): Promise<CancelResult> {
  const clientId = process.env.NAVERPAY_CLIENT_ID;
  const clientSecret = process.env.NAVERPAY_CLIENT_SECRET;
  const chainId = process.env.NAVERPAY_CHAIN_ID;
  if (!clientId || !clientSecret || !chainId) {
    return { ok: false, error: "NAVERPAY_* 미설정" };
  }

  try {
    const res = await fetch("https://dev-pub.apis.naver.com/naverpay-partner/naverpay/payments/v1/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
        "X-NaverPay-Chain-Id": chainId,
      },
      body: new URLSearchParams({
        paymentId: args.paymentId,
        cancelAmount: String(args.cancelAmount),
        cancelReason: args.cancelReason,
        cancelRequester: "2",
        taxScopeAmount: String(args.taxScopeAmount ?? args.cancelAmount),
        taxExScopeAmount: "0",
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (json?.code !== "Success") {
      return { ok: false, error: json?.message || `HTTP ${res.status}`, raw: json };
    }
    return { ok: true, raw: json };
  } catch (e: any) {
    return { ok: false, error: e?.message || "NaverPay 환불 호출 실패" };
  }
}

/**
 * 주문의 결제수단(provider)에 맞춰 환불 호출. 호출자는 paymentKey/tid/paymentId 중 알맞은 값을 providerTxnId 로 저장해두었다고 가정.
 */
export async function cancelByProvider(args: {
  provider: string | null | undefined;
  providerTxnId: string;
  reason: string;
  amount?: number;
}): Promise<CancelResult> {
  const p = (args.provider || "").toLowerCase();
  if (p.includes("toss")) {
    return cancelTossPayment({ paymentKey: args.providerTxnId, cancelReason: args.reason, cancelAmount: args.amount });
  }
  if (p.includes("inicis") || p.includes("kg")) {
    return cancelInicisPayment({ tid: args.providerTxnId, cancelReason: args.reason, cancelAmount: args.amount });
  }
  if (p.includes("naver")) {
    if (!args.amount) return { ok: false, error: "네이버페이는 cancelAmount 필수" };
    return cancelNaverPayment({ paymentId: args.providerTxnId, cancelReason: args.reason, cancelAmount: args.amount });
  }
  return { ok: false, error: `지원하지 않는 결제수단: ${args.provider}` };
}
