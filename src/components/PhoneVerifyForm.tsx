"use client";
import { useEffect, useState } from "react";

type Props = {
  initialPhone?: string;
  onVerified?: (result: { phone: string; verifiedToken: string }) => void;
  className?: string;
};

export default function PhoneVerifyForm({ initialPhone = "", onVerified, className }: Props) {
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"input" | "code">("input");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [devCode, setDevCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);

  useEffect(() => {
    if (resendIn > 0) {
      const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendIn]);

  useEffect(() => {
    if (step === "code" && expiresIn > 0) {
      const t = setTimeout(() => setExpiresIn((s) => Math.max(0, s - 1)), 1000);
      return () => clearTimeout(t);
    }
  }, [step, expiresIn]);

  const sendCode = async () => {
    setMsg(null); setLoading(true);
    try {
      const res = await fetch("/api/auth/phone/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "발송 실패");
      setStep("code");
      setResendIn(60);
      setExpiresIn(300);
      setMsg({ ok: true, text: "인증번호를 발송했습니다. (5분 이내 입력)" });
      if (data.devCode) setDevCode(data.devCode);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setMsg(null); setLoading(true);
    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "인증 실패");
      setMsg({ ok: true, text: "인증이 완료되었습니다." });
      onVerified?.({ phone: data.phone, verifiedToken: data.verifiedToken });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className={className}>
      <div className="flex gap-2">
        <input
          type="tel"
          inputMode="numeric"
          placeholder="010-0000-0000"
          className="input h-10 flex-1"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={step === "code"}
          maxLength={20}
        />
        {step === "input" ? (
          <button
            type="button" onClick={sendCode}
            disabled={loading || !phone}
            className="btn-primary text-sm h-10 whitespace-nowrap"
          >
            {loading ? "발송 중..." : "인증번호 발송"}
          </button>
        ) : (
          <button
            type="button" onClick={() => { setStep("input"); setCode(""); setDevCode(""); setMsg(null); }}
            className="btn-outline text-sm h-10 whitespace-nowrap"
          >번호 변경</button>
        )}
      </div>

      {step === "code" && (
        <div className="mt-3">
          <div className="flex gap-2">
            <input
              type="text" inputMode="numeric" maxLength={6}
              placeholder="6자리 인증번호"
              className="input h-10 flex-1 font-mono tracking-widest"
              value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            />
            <button
              type="button" onClick={verify} disabled={loading || code.length !== 6}
              className="btn-primary text-sm h-10 whitespace-nowrap"
            >
              {loading ? "확인 중..." : "확인"}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px] text-gray-500">
            <span>{expiresIn > 0 ? `남은 시간 ${fmtTime(expiresIn)}` : "만료됨"}</span>
            <button
              type="button" onClick={sendCode} disabled={resendIn > 0 || loading}
              className="text-brand-600 hover:underline disabled:text-gray-400 disabled:no-underline"
            >
              {resendIn > 0 ? `재발송 (${resendIn}초)` : "재발송"}
            </button>
          </div>
          {devCode && (
            <p className="mt-1 text-[11px] text-amber-600">개발모드 인증번호: <b>{devCode}</b></p>
          )}
        </div>
      )}

      {msg && (
        <p className={`mt-2 text-xs ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</p>
      )}
    </div>
  );
}
