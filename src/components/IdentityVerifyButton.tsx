"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  /** 본인인증 용도 */
  purpose: "find-id" | "find-password" | "register" | "reverify";
  /** 인증 완료시 호출 (verificationId 전달) */
  onComplete: (verificationId: string) => void;
  label?: string;
  className?: string;
};

/**
 * PASS / NICE / Mock 등 활성 provider 에 맞춰 본인인증을 시작하는 버튼.
 *
 * 동작:
 * 1. POST /api/auth/identity/start { purpose }
 * 2. 응답 mode 에 따라 분기:
 *    - 'form-mock'  : 새창으로 /identity/mock?reqSeq=... 열기
 *    - 'popup'      : 새창으로 PASS/NICE 인증창 (formData 가 있으면 form POST)
 *    - 'redirect'   : 현재창 이동 (가급적 사용 안 함)
 * 3. 새창에서 인증 완료시 /identity/complete 페이지가 window.opener.postMessage 로 verificationId 전송
 * 4. 부모창은 메시지를 받아 onComplete 호출
 */
export default function IdentityVerifyButton({ purpose, onComplete, label, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);

  // postMessage 리스너
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as any;
      if (data?.type === "identity:complete" && typeof data.verificationId === "string") {
        try { popupRef.current?.close(); } catch { /* ignore */ }
        setLoading(false);
        onComplete(data.verificationId);
      } else if (data?.type === "identity:failed") {
        try { popupRef.current?.close(); } catch { /* ignore */ }
        setLoading(false);
        setError(data.reason || "본인인증에 실패했습니다.");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onComplete]);

  const start = async () => {
    setLoading(true); setError(null); setProvider(null);
    try {
      const res = await fetch("/api/auth/identity/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "본인인증 요청 실패");

      setProvider(data.provider);
      const w = 500, h = 600;
      const left = (window.screen.width - w) / 2;
      const top = (window.screen.height - h) / 2;
      const features = `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`;

      if (data.mode === "form-mock") {
        popupRef.current = window.open(data.url, "identity_verify", features);
      } else if (data.mode === "popup") {
        popupRef.current = window.open("about:blank", "identity_verify", features);
        if (data.formData && popupRef.current) {
          // hidden form 으로 POST
          const form = document.createElement("form");
          form.method = "POST";
          form.action = data.url;
          form.target = "identity_verify";
          form.style.display = "none";
          for (const [k, v] of Object.entries(data.formData)) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = k;
            input.value = String(v);
            form.appendChild(input);
          }
          document.body.appendChild(form);
          form.submit();
          form.remove();
        } else {
          popupRef.current = window.open(data.url, "identity_verify", features);
        }
      } else if (data.mode === "redirect") {
        window.location.href = data.url;
        return;
      }

      if (!popupRef.current) {
        setLoading(false);
        setError("팝업이 차단되었습니다. 브라우저 팝업 차단을 해제하고 다시 시도해주세요.");
      }
    } catch (e: any) {
      setLoading(false);
      setError(e?.message || "본인인증 시작 실패");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className={className || "w-full h-12 rounded bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-60"}
      >
        {loading ? "본인인증 진행 중..." : (label || "📱 휴대폰 본인인증")}
      </button>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      {provider === "mock" && (
        <p className="text-[11px] text-amber-600 mt-2">
          ⚠ 개발용 모의(mock) 본인인증입니다. 운영 도입시 실제 PASS/NICE 인증으로 자동 전환됩니다.
        </p>
      )}
    </div>
  );
}
