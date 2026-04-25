"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", passwordConfirm: "", name: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.passwordConfirm) { setError("비밀번호가 일치하지 않습니다."); return; }
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password, name: form.name, phone: form.phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "가입 실패"); return; }
    alert("가입이 완료되었습니다. 로그인해주세요.");
    router.push("/login");
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="container-mall py-16 max-w-md">
      <h1 className="text-2xl font-bold text-center mb-8">회원가입</h1>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">이메일 *</label>
          <input type="email" required className="input h-11" value={form.email} onChange={set("email")} />
        </div>
        <div>
          <label className="label">비밀번호 * (8자 이상)</label>
          <input type="password" required minLength={8} className="input h-11" value={form.password} onChange={set("password")} />
        </div>
        <div>
          <label className="label">비밀번호 확인 *</label>
          <input type="password" required className="input h-11" value={form.passwordConfirm} onChange={set("passwordConfirm")} />
        </div>
        <div>
          <label className="label">이름 *</label>
          <input type="text" required className="input h-11" value={form.name} onChange={set("name")} />
        </div>
        <div>
          <label className="label">연락처</label>
          <input type="tel" placeholder="010-0000-0000" className="input h-11" value={form.phone} onChange={set("phone")} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full h-12 text-base mt-2">
          {loading ? "처리 중..." : "가입하기"}
        </button>
      </form>
      <div className="mt-6 text-center text-sm text-gray-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-brand-600 hover:underline">로그인</Link>
      </div>
    </div>
  );
}
