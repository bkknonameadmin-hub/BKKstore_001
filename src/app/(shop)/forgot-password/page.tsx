"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import IdentityVerifyButton from "@/components/IdentityVerifyButton";

type Tab = "email" | "pass";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("email");

  // 이메일 탭 상태
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailDone, setEmailDone] = useState(false);
  const [emailError, setEmailError] = useState("");

  // PASS 탭 상태
  const [identifier, setIdentifier] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailLoading) return;
    setEmailError("");
    setEmailLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "요청 실패");
      }
      setEmailDone(true);
    } catch (e: any) {
      setEmailError(e.message || "요청 실패");
    } finally {
      setEmailLoading(false);
    }
  };

  const onPassVerified = async (verificationId: string) => {
    if (!identifier.trim()) {
      setPassError("아이디(또는 이메일)를 먼저 입력해주세요.");
      return;
    }
    setPassLoading(true); setPassError(null);
    try {
      const res = await fetch("/api/auth/find-password/by-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "비밀번호 재설정 실패");
      // 토큰을 받았으면 즉시 reset-password 페이지로
      router.push(`/reset-password?token=${data.resetToken}`);
    } catch (e: any) {
      setPassError(e?.message || "비밀번호 재설정 실패");
      setPassLoading(false);
    }
  };

  if (emailDone) {
    return (
      <div className="container-mall py-16 max-w-md">
        <h1 className="text-xl font-bold">비밀번호 재설정 메일 발송 완료</h1>
        <p className="mt-3 text-sm text-gray-600">
          입력하신 이메일이 가입된 회원이라면 1시간 안에 재설정 링크가 발송됩니다.
          메일이 보이지 않으면 스팸함도 확인해주세요.
        </p>
        <Link href="/login" className="btn-outline mt-6 inline-flex">로그인 화면으로</Link>
      </div>
    );
  }

  return (
    <div className="container-mall py-12 max-w-md">
      <h1 className="text-xl font-bold mb-2">비밀번호 찾기</h1>
      <p className="text-sm text-gray-600 mb-6">
        이메일 또는 휴대폰 본인인증으로 비밀번호를 재설정할 수 있습니다.
      </p>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 mb-5">
        <button
          type="button"
          onClick={() => setTab("email")}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "email"
              ? "text-brand-600 border-brand-600"
              : "text-gray-500 border-transparent hover:text-gray-700"
          }`}
        >
          ✉️ 이메일로 찾기
        </button>
        <button
          type="button"
          onClick={() => setTab("pass")}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "pass"
              ? "text-brand-600 border-brand-600"
              : "text-gray-500 border-transparent hover:text-gray-700"
          }`}
        >
          📱 휴대폰 본인인증
        </button>
      </div>

      {tab === "email" && (
        <form onSubmit={submitEmail} className="space-y-3">
          <label className="block text-sm">
            <span className="text-gray-700">이메일</span>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email"
              className="input mt-1 w-full"
              placeholder="you@example.com"
            />
          </label>
          {emailError && <p role="alert" className="text-sm text-red-600">{emailError}</p>}
          <button type="submit" disabled={emailLoading} className="btn-primary w-full">
            {emailLoading ? "전송 중..." : "재설정 메일 받기"}
          </button>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            가입한 이메일이 기억나지 않거나 더 이상 사용할 수 없다면 휴대폰 본인인증 탭을 이용해주세요.
          </p>
        </form>
      )}

      {tab === "pass" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm">
              <span className="text-gray-700">아이디 또는 이메일</span>
              <input
                type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                required autoComplete="username"
                className="input mt-1 w-full"
                placeholder="비밀번호를 재설정할 계정"
              />
            </label>
            <p className="text-[11px] text-gray-400 mt-1">
              아이디를 모른다면{" "}
              <Link href="/forgot-id" className="text-brand-600 hover:underline">아이디 찾기</Link>
              {" "}먼저 진행해주세요.
            </p>
          </div>

          <IdentityVerifyButton
            purpose="find-password"
            onComplete={onPassVerified}
            label="📱 PASS 본인인증으로 재설정"
          />
          {passLoading && <p className="text-xs text-gray-500">처리 중...</p>}
          {passError && <p className="text-xs text-red-500">{passError}</p>}

          <p className="text-[11px] text-gray-400 leading-relaxed pt-2 border-t border-gray-100">
            본인인증 통과시 즉시 비밀번호 재설정 페이지로 이동합니다.<br />
            이메일이 닿지 않는 경우 가장 빠른 방법입니다.
          </p>
        </div>
      )}

      <div className="mt-8 text-xs text-gray-500 flex justify-center gap-4">
        <Link href="/login" className="hover:text-brand-600">로그인</Link>
        <span className="text-gray-300">|</span>
        <Link href="/forgot-id" className="hover:text-brand-600">아이디 찾기</Link>
        <span className="text-gray-300">|</span>
        <Link href="/register" className="hover:text-brand-600">회원가입</Link>
      </div>
    </div>
  );
}
