"use client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function IdentityFailedPage() {
  const sp = useSearchParams();
  const reason = sp.get("reason") || "본인인증에 실패했습니다.";

  useEffect(() => {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "identity:failed", reason }, window.location.origin);
        setTimeout(() => { try { window.close(); } catch { /* */ } }, 1500);
      }
    } catch { /* */ }
  }, [reason]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="text-center p-8 max-w-sm">
        <div className="text-6xl mb-4">✗</div>
        <h1 className="text-xl font-bold text-red-700 mb-2">본인인증 실패</h1>
        <p className="text-sm text-gray-600 break-keep">{reason}</p>
        <button
          type="button"
          onClick={() => { try { window.close(); } catch { /* */ } }}
          className="mt-6 text-xs text-gray-500 underline"
        >
          창 닫기
        </button>
      </div>
    </div>
  );
}
