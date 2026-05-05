"use client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * 본인인증 완료 페이지 (팝업창에서 표시).
 *
 * provider 콜백 → /api/auth/identity/return → 이 페이지로 리다이렉트.
 * window.opener.postMessage 로 verificationId 전달 후 자동 종료.
 */
export default function IdentityCompletePage() {
  const sp = useSearchParams();
  const vid = sp.get("vid") || "";

  useEffect(() => {
    if (!vid) return;
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "identity:complete", verificationId: vid }, window.location.origin);
        // 잠깐 보여준 뒤 닫기
        setTimeout(() => { try { window.close(); } catch { /* */ } }, 800);
      }
    } catch (e) {
      // ignore
    }
  }, [vid]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">✓</div>
        <h1 className="text-xl font-bold text-emerald-700 mb-2">본인인증 완료</h1>
        <p className="text-sm text-gray-600">잠시 후 이 창은 자동으로 닫힙니다.</p>
        <p className="text-[11px] text-gray-400 mt-4 font-mono">vid: {vid.slice(0, 16)}...</p>
      </div>
    </div>
  );
}
