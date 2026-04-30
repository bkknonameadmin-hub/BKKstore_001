"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PhoneVerifyForm from "@/components/PhoneVerifyForm";

function maskPhone(p: string): string {
  const n = p.replace(/[^0-9]/g, "");
  if (n.length < 10) return p;
  return `${n.slice(0, 3)}-****-${n.slice(-4)}`;
}

export default function PhoneVerifySection({
  currentPhone, verified, verifiedAt,
}: {
  currentPhone: string | null;
  verified: boolean;
  verifiedAt: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (verified && !editing) {
    return (
      <div className="text-sm">
        <dl className="space-y-1.5">
          <div className="flex justify-between"><dt className="text-gray-500">인증된 번호</dt><dd className="font-mono">{currentPhone ? maskPhone(currentPhone) : "-"}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">인증일시</dt><dd>{verifiedAt ? new Date(verifiedAt).toLocaleString("ko-KR") : "-"}</dd></div>
        </dl>
        <button onClick={() => setEditing(true)} className="mt-3 btn-outline h-9 text-xs">번호 변경 / 재인증</button>
        <p className="mt-2 text-[11px] text-gray-400">
          본인 명의 휴대폰 번호로 인증되어 있습니다. 주문/배송 알림을 받으실 수 있어요.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        본인 명의 휴대폰 번호를 인증하시면 비밀번호 분실시 본인 확인 등에 사용됩니다.
      </p>
      <PhoneVerifyForm
        initialPhone={currentPhone || ""}
        onVerified={() => {
          setEditing(false);
          router.refresh();
        }}
      />
      {editing && (
        <button onClick={() => setEditing(false)} className="mt-3 text-xs text-gray-500 hover:text-brand-600">취소</button>
      )}
    </div>
  );
}
