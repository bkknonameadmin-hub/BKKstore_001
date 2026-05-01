import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 보안 헤더 미들웨어
 * - HSTS: HTTPS 강제 (운영 환경)
 * - X-Frame-Options: 클릭재킹 방어
 * - X-Content-Type-Options: MIME 스니핑 방어
 * - Referrer-Policy: 레퍼러 최소화
 * - Permissions-Policy: 불필요한 브라우저 기능 차단
 * - Content-Security-Policy: 외부 스크립트/이미지 화이트리스트
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // 결제 SDK / 주소 검색 / 추적 API / OAuth 등을 위해 외부 도메인 일부 허용
  const csp = [
    "default-src 'self'",
    // Next.js 인라인 스크립트 + 외부 결제/SNS SDK
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.tosspayments.com https://stdpay.inicis.com https://t1.daumcdn.net https://*.naver.com https://nsp.pay.naver.com https://*.kakao.com https://*.kakaocdn.net https://developers.kakao.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.tosspayments.com https://*.inicis.com https://*.naver.com https://*.kakao.com https://info.sweettracker.co.kr https://hooks.slack.com https://apis.aligo.in",
    "frame-src 'self' https://*.tosspayments.com https://*.inicis.com https://*.naver.com https://*.kakao.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://*.tosspayments.com https://*.inicis.com https://*.naver.com https://*.kakao.com",
    "frame-ancestors 'none'",
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)");
  res.headers.set("X-DNS-Prefetch-Control", "on");

  // 운영 환경에서만 HSTS (로컬 HTTPS 인증서 문제 방지)
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return res;
}

export const config = {
  matcher: [
    // 정적 파일과 API 경로 일부 제외
    "/((?!_next/static|_next/image|favicon.ico|images/|uploads/).*)",
  ],
};
