"use client";
import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin-error]", error);
  }, [error]);

  return (
    <div className="p-8 text-center" role="alert">
      <h1 className="text-lg font-bold text-red-600">관리자 화면 오류</h1>
      <p className="mt-2 text-sm text-gray-600">{error.message || "알 수 없는 오류"}</p>
      {error.digest && (
        <p className="mt-1 text-[11px] text-gray-400 font-mono">code: {error.digest}</p>
      )}
      <button onClick={reset} className="btn-outline mt-4">다시 시도</button>
    </div>
  );
}
