"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState(false); // true 면 OTP 입력 단계
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await signIn("credentials", { redirect: false, email, password, otpCode });
    setLoading(false);
    if (res?.error) {
      if (res.error === "OTP_REQUIRED") {
        // 2FA 활성 회원: OTP 입력 단계로 전환
        setOtpStep(true);
        setError("");
      } else if (res.error === "OTP_INVALID") {
        setError("OTP 코드가 올바르지 않습니다. 인증 앱의 6자리 코드 또는 백업코드를 입력해주세요.");
      } else if (res.error.includes("로그인 시도") || res.error.includes("탈퇴") || res.error.includes("정지")) {
        setError(res.error);
      } else {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      }
    } else {
      router.push(callbackUrl);
    }
  };

  const resetOtp = () => {
    setOtpStep(false);
    setOtpCode("");
    setError("");
  };

  const social = (provider: "naver" | "kakao") => {
    signIn(provider, { callbackUrl });
  };

  return (
    <div className="container-mall py-16 max-w-md">
      <h1 className="text-2xl font-bold text-center mb-8">로그인</h1>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">이메일</label>
          <input
            type="email" required className="input h-11" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            disabled={otpStep}
          />
        </div>
        <div>
          <label className="label">비밀번호</label>
          <input
            type="password" required className="input h-11" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            disabled={otpStep}
          />
        </div>

        {otpStep && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 space-y-2">
            <label className="label text-amber-800">
              🔐 2단계 인증 코드
            </label>
            <input
              type="text" inputMode="text" autoComplete="one-time-code"
              className="input h-11 font-mono tracking-widest"
              placeholder="6자리 OTP 또는 XXXX-XXXX 백업코드"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              autoFocus required maxLength={32}
            />
            <p className="text-[11px] text-amber-700 leading-relaxed">
              인증 앱(Google Authenticator / Authy 등)의 6자리 코드를 입력해주세요.<br />
              인증 앱을 사용할 수 없는 경우 발급받은 백업코드(XXXX-XXXX)를 입력하면 됩니다. (백업코드는 1회용)
            </p>
            <button type="button" onClick={resetOtp} className="text-xs text-amber-700 underline">
              ← 다른 계정으로 로그인
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full h-12 text-base">
          {loading ? "로그인 중..." : (otpStep ? "OTP 확인 후 로그인" : "이메일 로그인")}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
        <div className="flex-1 h-px bg-gray-200" />
        <span>또는 SNS로 간편 로그인</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => social("naver")}
          className="w-full h-12 rounded text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#03C75A" }}
        >
          <NaverIcon /> 네이버로 로그인
        </button>
        <button
          type="button"
          onClick={() => social("kakao")}
          className="w-full h-12 rounded text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#FEE500", color: "#000000d9" }}
        >
          <KakaoIcon /> 카카오로 로그인
        </button>
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        아직 회원이 아니신가요?{" "}
        <Link href="/register" className="text-brand-600 hover:underline">회원가입</Link>
      </div>

      <p className="mt-4 text-[11px] text-gray-400 text-center leading-relaxed">
        SSL/TLS 암호화 통신 · 비밀번호는 본 사이트에 평문으로 저장되지 않습니다.<br />
        소셜 로그인시 해당 서비스의 약관과 개인정보 처리방침이 적용됩니다.
      </p>
    </div>
  );
}

function NaverIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.273 12.845 7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727z" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.829 1.872 5.297 4.694 6.687l-1.18 4.314c-.103.378.32.69.658.485l5.18-3.422c.213.022.432.036.648.036 5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
    </svg>
  );
}
