"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry 자동 캡처는 Next의 instrumentation에서 처리
    console.error("[shop-error]", error);
  }, [error]);

  return (
    <div className="container-mall py-16 text-center" role="alert">
      <p className="text-5xl">⚠️</p>
      <h1 className="mt-4 text-xl font-bold">일시적인 오류가 발생했습니다</h1>
      <p className="mt-2 text-sm text-gray-500">
        잠시 후 다시 시도해주세요. 문제가 계속되면 고객센터로 문의해주세요.
      </p>
      {error.digest && (
        <p className="mt-2 text-[11px] text-gray-400 font-mono">code: {error.digest}</p>
      )}
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={reset} className="btn-primary">다시 시도</button>
        <Link href="/" className="btn-outline">홈으로</Link>
      </div>
    </div>
  );
}
