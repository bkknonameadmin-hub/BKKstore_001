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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await signIn("credentials", { redirect: false, email, password });
    setLoading(false);
    if (res?.error) setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    else router.push(callbackUrl);
  };

  return (
    <div className="container-mall py-16 max-w-md">
      <h1 className="text-2xl font-bold text-center mb-8">로그인</h1>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">이메일</label>
          <input type="email" required className="input h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">비밀번호</label>
          <input type="password" required className="input h-11" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full h-12 text-base">
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <div className="mt-6 text-center text-sm text-gray-500">
        아직 회원이 아니신가요?{" "}
        <Link href="/register" className="text-brand-600 hover:underline">회원가입</Link>
      </div>
    </div>
  );
}
