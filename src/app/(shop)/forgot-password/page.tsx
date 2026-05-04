"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
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
      setDone(true);
    } catch (e: any) {
      setError(e.message || "요청 실패");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
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
    <div className="container-mall py-16 max-w-md">
      <h1 className="text-xl font-bold">비밀번호 찾기</h1>
      <p className="mt-2 text-sm text-gray-600">
        가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <label className="block text-sm">
          <span className="text-gray-700">이메일</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="input mt-1 w-full"
            placeholder="you@example.com"
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? "전송 중..." : "재설정 메일 받기"}
        </button>
      </form>
      <div className="mt-6 text-xs text-gray-500 flex justify-between">
        <Link href="/login" className="underline">로그인</Link>
        <Link href="/register" className="underline">회원가입</Link>
      </div>
    </div>
  );
}
