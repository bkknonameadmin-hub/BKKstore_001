import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateTotpSecret, generateQrDataUrl } from "@/lib/totp";

/**
 * TOTP 셋업 시작 — secret + QR 코드 반환
 * 회원이 OTP 앱에 등록 → enable API로 6자리 검증
 *
 * secret 은 이 시점에 DB 저장 안 함 (verify-enable 단계에서 저장)
 * 클라이언트가 임시 보관 → enable 시 재전송
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { secret, otpauth } = generateTotpSecret(session.user.email);
  const qrDataUrl = await generateQrDataUrl(otpauth);
  return NextResponse.json({ secret, otpauth, qrDataUrl });
}
