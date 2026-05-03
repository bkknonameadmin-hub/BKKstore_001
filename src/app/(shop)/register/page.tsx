"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "@/store/toast";

function checkPasswordClient(pw: string): { score: number; label: string; color: string; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  if (pw.length >= 12) score++; else reasons.push("12자 이상");
  if (/[a-z]/.test(pw)) score++; else reasons.push("소문자");
  if (/[A-Z]/.test(pw)) score++; else reasons.push("대문자");
  if (/[0-9]/.test(pw)) score++; else reasons.push("숫자");
  if (/[^A-Za-z0-9]/.test(pw)) score++; else reasons.push("특수문자");

  if (score <= 2) return { score, label: "약함", color: "bg-red-500", reasons };
  if (score <= 3) return { score, label: "보통", color: "bg-amber-500", reasons };
  if (score <= 4) return { score, label: "강함", color: "bg-emerald-500", reasons };
  return { score, label: "매우 강함", color: "bg-emerald-600", reasons };
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", passwordConfirm: "", name: "", phone: "" });
  const [agreeTos, setAgreeTos] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pwInfo = useMemo(() => checkPasswordClient(form.password), [form.password]);
  const canSubmit = pwInfo.score >= 4 && form.password === form.passwordConfirm && agreeTos && agreePrivacy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.passwordConfirm) { setError("비밀번호가 일치하지 않습니다."); return; }
    if (pwInfo.score < 4) { setError("비밀번호 정책을 만족하지 못합니다."); return; }

    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password, name: form.name, phone: form.phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "가입 실패"); return; }
    toast.success("가입 완료! 적립금 1,000원이 지급되었어요 🎁");
    router.push("/login");
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="container-mall py-16 max-w-md">
      <h1 className="text-2xl font-bold text-center mb-2">회원가입</h1>
      <p className="text-center text-xs text-gray-500 mb-8">가입시 적립금 1,000원이 즉시 지급됩니다 🎁</p>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">이메일 *</label>
          <input type="email" required className="input h-11" autoComplete="email" value={form.email} onChange={set("email")} />
        </div>

        <div>
          <label className="label">비밀번호 *</label>
          <input
            type="password" required minLength={12} className="input h-11" autoComplete="new-password"
            value={form.password} onChange={set("password")}
          />
          {form.password && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded bg-gray-100 overflow-hidden">
                  <div className={`h-full transition-all ${pwInfo.color}`} style={{ width: `${(pwInfo.score / 5) * 100}%` }} />
                </div>
                <span className="text-xs text-gray-600">{pwInfo.label}</span>
              </div>
              {pwInfo.reasons.length > 0 && (
                <p className="text-[11px] text-red-500 mt-1">필요: {pwInfo.reasons.join(", ")}</p>
              )}
              <p className="text-[11px] text-gray-400 mt-0.5">12자 이상 · 대/소문자, 숫자, 특수문자 중 3종 이상 조합</p>
            </div>
          )}
        </div>

        <div>
          <label className="label">비밀번호 확인 *</label>
          <input
            type="password" required className="input h-11" autoComplete="new-password"
            value={form.passwordConfirm} onChange={set("passwordConfirm")}
          />
          {form.passwordConfirm && form.password !== form.passwordConfirm && (
            <p className="text-[11px] text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>
          )}
        </div>

        <div>
          <label className="label">이름 *</label>
          <input type="text" required className="input h-11" autoComplete="name" value={form.name} onChange={set("name")} />
        </div>

        <div>
          <label className="label">연락처</label>
          <input type="tel" placeholder="010-0000-0000" className="input h-11" autoComplete="tel" value={form.phone} onChange={set("phone")} />
        </div>

        <div className="space-y-2 pt-2 text-xs">
          <label className="flex items-start gap-2 text-gray-600">
            <input type="checkbox" checked={agreeTos} onChange={(e) => setAgreeTos(e.target.checked)} className="mt-0.5" />
            <span><b>(필수)</b> 이용약관에 동의합니다.</span>
          </label>
          <label className="flex items-start gap-2 text-gray-600">
            <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="mt-0.5" />
            <span><b>(필수)</b> 개인정보 수집 및 이용에 동의합니다. (이메일/이름/연락처/배송지)</span>
          </label>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={loading || !canSubmit} className="btn-primary w-full h-12 text-base mt-2">
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
