"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const sp = useSearchParams();
  const token = sp.get("token");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("인증 토큰이 누락되었습니다."); return; }
    fetch(`/api/auth/verify-email?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) { setStatus("ok"); setMessage(`${data.email} 인증이 완료되었습니다.`); }
        else { setStatus("error"); setMessage(data.error || "인증 실패"); }
      })
      .catch((e) => { setStatus("error"); setMessage(e.message); });
  }, [token]);

  return (
    <div className="container-mall py-20 max-w-lg text-center">
      {status === "loading" && (
        <>
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-xl font-bold">이메일 인증 처리 중...</h1>
        </>
      )}
      {status === "ok" && (
        <>
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold">이메일 인증 완료!</h1>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
          <div className="mt-8 flex gap-2 justify-center">
            <Link href="/" className="btn-outline">홈으로</Link>
            <Link href="/login" className="btn-primary">로그인</Link>
          </div>
        </>
      )}
      {status === "error" && (
        <>
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold">인증 실패</h1>
          <p className="mt-2 text-sm text-red-500">{message}</p>
          <p className="mt-2 text-xs text-gray-500">로그인 후 마이페이지에서 인증 메일을 다시 받으실 수 있습니다.</p>
          <div className="mt-6">
            <Link href="/login" className="btn-primary">로그인</Link>
          </div>
        </>
      )}
    </div>
  );
}
