"use client";
import { signOut } from "next-auth/react";
import { useState } from "react";

const REASONS = [
  "더 이상 사용하지 않음",
  "원하는 상품이 없음",
  "배송/CS 불만",
  "가격이 비쌈",
  "회원 정보 보호",
  "기타",
];

export default function WithdrawForm({ hasPassword, email }: { hasPassword: boolean; email: string }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [reasonDetail, setReasonDetail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit =
    confirmText === "탈퇴합니다" &&
    (!hasPassword || password.length > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!confirm("정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;

    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/me/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason === "기타" ? reasonDetail.trim() : reason,
          password: hasPassword ? password : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "탈퇴 처리 실패");
      alert("탈퇴 처리되었습니다. 그동안 이용해 주셔서 감사합니다.");
      await signOut({ callbackUrl: "/" });
    } catch (e: any) {
      setErr(e.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div>
        <label className="label">탈퇴 사유</label>
        <select className="input h-10" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {reason === "기타" && (
        <div>
          <label className="label">상세 사유</label>
          <textarea
            className="input text-sm" rows={3} maxLength={500}
            value={reasonDetail} onChange={(e) => setReasonDetail(e.target.value)}
            placeholder="서비스 개선에 활용됩니다."
          />
        </div>
      )}

      {hasPassword && (
        <div>
          <label className="label">비밀번호 확인 *</label>
          <input
            type="password" className="input h-10" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-[11px] text-gray-400 mt-1">{email} 의 현재 비밀번호를 입력해주세요.</p>
        </div>
      )}

      <div>
        <label className="label">
          탈퇴를 원하시면 아래에 <b className="text-red-600">탈퇴합니다</b> 라고 입력해주세요.
        </label>
        <input
          type="text" className="input h-10"
          value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
          placeholder="탈퇴합니다"
        />
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="submit" disabled={loading || !canSubmit}
          className="flex-1 h-12 rounded text-white font-medium bg-red-500 hover:bg-red-600 disabled:opacity-40"
        >
          {loading ? "처리 중..." : "회원 탈퇴"}
        </button>
        <a href="/mypage/security" className="btn-outline h-12 px-6 inline-flex items-center">취소</a>
      </div>
    </form>
  );
}
