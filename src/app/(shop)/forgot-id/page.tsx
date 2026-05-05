"use client";
import Link from "next/link";
import { useState } from "react";
import IdentityVerifyButton from "@/components/IdentityVerifyButton";

type Account = {
  usernameMasked: string | null;
  emailMasked: string;
  createdAt: string;
  hasUsername: boolean;
};

export default function ForgotIdPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onVerified = async (verificationId: string) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/find-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "조회 실패");
      setAccounts(data.accounts || []);
    } catch (e: any) {
      setError(e?.message || "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-mall py-12 max-w-md">
      <h1 className="text-2xl font-bold text-center mb-2">아이디 찾기</h1>
      <p className="text-center text-xs text-gray-500 mb-8">
        가입시 본인인증을 진행하셨다면 휴대폰 본인인증으로 아이디를 찾을 수 있습니다.
      </p>

      {accounts === null ? (
        <div className="space-y-4">
          <div className="border border-gray-200 rounded p-5 bg-white">
            <p className="text-sm text-gray-700 mb-4">
              본인 명의의 휴대폰으로 PASS 본인인증을 진행해주세요.
            </p>
            <IdentityVerifyButton purpose="find-id" onComplete={onVerified} />
            {loading && <p className="text-xs text-gray-500 mt-2">조회 중...</p>}
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>

          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            본인인증 정보로 등록된 회원 정보를 조회합니다.<br />
            본인인증 정보 없이 가입하셨다면 고객센터로 문의해주세요.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-gray-200 rounded p-5 bg-white">
            <h2 className="text-sm font-bold mb-3">조회 결과</h2>
            {accounts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                본인인증 정보와 일치하는 회원이 없습니다.<br />
                <Link href="/register" className="text-brand-600 hover:underline">가입하러 가기 →</Link>
              </p>
            ) : (
              <ul className="space-y-3">
                {accounts.map((acc, i) => (
                  <li key={i} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs text-gray-500">아이디</span>
                      <span className="text-sm font-mono font-bold">
                        {acc.hasUsername ? acc.usernameMasked : <span className="text-gray-400 italic text-xs">아이디 미설정</span>}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 mt-1">
                      <span className="text-xs text-gray-500">이메일</span>
                      <span className="text-xs font-mono text-gray-600">{acc.emailMasked}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 mt-1">
                      <span className="text-xs text-gray-500">가입일</span>
                      <span className="text-xs text-gray-600">{new Date(acc.createdAt).toLocaleDateString("ko-KR")}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link href="/login" className="block text-center py-3 rounded border border-gray-300 text-sm hover:bg-gray-50">
              로그인 하기
            </Link>
            <Link href="/forgot-password" className="block text-center py-3 rounded bg-brand-600 text-white text-sm font-bold hover:bg-brand-700">
              비밀번호 찾기
            </Link>
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-xs text-gray-500 space-x-3">
        <Link href="/login" className="hover:text-brand-600">로그인</Link>
        <span className="text-gray-300">|</span>
        <Link href="/register" className="hover:text-brand-600">회원가입</Link>
        <span className="text-gray-300">|</span>
        <Link href="/forgot-password" className="hover:text-brand-600">비밀번호 찾기</Link>
      </div>
    </div>
  );
}
