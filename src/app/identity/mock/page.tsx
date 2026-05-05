"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * 개발용 모의 본인인증 폼.
 * IdentityVerifyButton 이 popup 으로 열면 reqSeq 를 받아 사용자 입력을
 * /api/auth/identity/return?... 로 GET 전송 → return 라우트가 IdentityVerification 을
 * COMPLETED 로 업데이트 + /identity/complete 로 리다이렉트.
 */
export default function MockIdentityPage() {
  const sp = useSearchParams();
  const reqSeq = sp.get("reqSeq") || "";
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"M" | "F">("M");

  if (!reqSeq) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 text-sm">잘못된 접근입니다 (reqSeq 없음).</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 text-center">
        <h1 className="text-base font-bold">📱 모의 본인인증 (개발용)</h1>
        <p className="text-[11px] opacity-90 mt-1">실제 PASS 앱 대신 입력값으로 본인을 흉내냅니다.</p>
      </header>

      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        <div className="bg-white rounded-lg p-5 shadow-sm space-y-3">
          <div className="text-center pb-3 border-b border-gray-100">
            <div className="text-xs text-gray-500">통신사 본인확인 서비스</div>
            <div className="text-xs font-mono text-gray-400 mt-1">REQ_SEQ: {reqSeq.slice(0, 12)}...</div>
          </div>

          {/* 진짜 PASS 처럼 보이게 */}
          <form
            method="GET"
            action="/api/auth/identity/return"
            className="space-y-3"
          >
            <input type="hidden" name="reqSeq" value={reqSeq} />

            <div>
              <label className="text-xs font-bold text-gray-700">이름</label>
              <input
                type="text" name="name" required maxLength={30}
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700">생년월일 (YYYYMMDD)</label>
              <input
                type="text" name="birthDate" required pattern="\d{8}" maxLength={8} inputMode="numeric"
                value={birthDate} onChange={(e) => setBirthDate(e.target.value.replace(/\D/g, ""))}
                placeholder="19950101"
                className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded text-sm font-mono tracking-wider"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700">휴대폰 번호</label>
              <input
                type="tel" name="phone" required maxLength={13} inputMode="tel"
                value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="01012345678"
                className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded text-sm font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700">성별</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <label className={`flex items-center justify-center py-2 rounded border cursor-pointer text-sm ${gender === "M" ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold" : "border-gray-300 text-gray-600"}`}>
                  <input type="radio" name="gender" value="M" checked={gender === "M"} onChange={() => setGender("M")} className="sr-only" />
                  남자
                </label>
                <label className={`flex items-center justify-center py-2 rounded border cursor-pointer text-sm ${gender === "F" ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold" : "border-gray-300 text-gray-600"}`}>
                  <input type="radio" name="gender" value="F" checked={gender === "F"} onChange={() => setGender("F")} className="sr-only" />
                  여자
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 py-3 rounded bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
            >
              ✓ 본인인증 완료
            </button>
          </form>

          <p className="text-[10px] text-amber-600 text-center pt-3 leading-relaxed">
            이것은 개발용 모의 본인인증입니다.<br />
            운영 환경에서는 실제 PASS 앱(SKT/KT/LG U+)이 호출됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}
