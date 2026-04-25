"use client";
// 다음 우편번호 서비스(카카오)
// 공식 가이드: https://postcode.map.daum.net/guide
// 무료 사용 가능. 별도 키 발급 필요 없음.

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    daum?: any;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadPostcodeScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("not browser"));
  if (window.daum?.Postcode) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("우편번호 서비스 로드 실패"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

type Result = {
  zipCode: string;
  address1: string; // 도로명 주소 (또는 지번)
};

type Props = {
  onSelect: (result: Result) => void;
  className?: string;
  buttonText?: string;
};

export default function AddressSearch({ onSelect, className, buttonText = "우편번호 검색" }: Props) {
  const [loading, setLoading] = useState(false);

  const open = async () => {
    setLoading(true);
    try {
      await loadPostcodeScript();
      new window.daum.Postcode({
        oncomplete: (data: any) => {
          // 도로명 주소 우선, 없으면 지번 주소
          const address = data.roadAddress || data.jibunAddress || data.address;
          // 참고항목 (예: 빌딩명, 동/리 등) 추가
          let extra = "";
          if (data.bname && /[동|로|가]$/g.test(data.bname)) extra += data.bname;
          if (data.buildingName && data.apartment === "Y") extra += (extra ? ", " : "") + data.buildingName;
          const full = extra ? `${address} (${extra})` : address;

          onSelect({
            zipCode: data.zonecode,
            address1: full,
          });
        },
      }).open();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={loading}
      className={className || "btn-outline h-10 px-4 text-sm whitespace-nowrap"}
    >
      {loading ? "로딩 중..." : buttonText}
    </button>
  );
}
