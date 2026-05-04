"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    if (!token) { setError("유효하지 않은 접근입니다."); return; }
    if (pw1 !== pw2) { setError("비밀번호가 일치하지 않습니다."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "재설정 실패");
      router.replace("/login?reset=ok");
    } catch (e: any) {
      setError(e.message || "재설정 실패");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div>
        <p className="text-sm text-red-600">유효하지 않은 접근입니다.</p>
        <Link href="/forgot-password" className="btn-outline mt-4 inline-flex">다시 요청</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <label className="block text-sm">
        <span className="text-gray-700">새 비밀번호</span>
        <input
          type="password"
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
          required
          minLength={12}
          autoComplete="new-password"
          className="input mt-1 w-full"
          placeholder="12자 이상, 대/소/숫자/특수 중 3종 이상"
        />
      </label>
      <label className="block text-sm">
        <span className="text-gray-700">새 비밀번호 확인</span>
        <input
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          required
          minLength={12}
          autoComplete="new-password"
          className="input mt-1 w-full"
        />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "변경 중..." : "비밀번호 변경"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="container-mall py-16 max-w-md">
      <h1 className="text-xl font-bold">비밀번호 재설정</h1>
      <Suspense fallback={<p className="mt-4 text-sm text-gray-500">불러오는 중...</p>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
