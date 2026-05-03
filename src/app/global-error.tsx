"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";

/**
 * Next.js global-error.tsx
 * - 루트 layout 에서 발생한 에러까지 잡는 최상위 핸들러
 * - Sentry 로 전송 + 사용자에게 안전한 에러 화면 표시
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body style={{
        fontFamily: "system-ui, sans-serif",
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f6f8",
      }}>
        <div style={{ textAlign: "center", padding: 40, maxWidth: 480 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
            예상치 못한 오류가 발생했어요
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 24px" }}>
            잠시 후 다시 시도해주세요. 문제가 반복되면 고객센터로 문의 부탁드립니다.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace", margin: "0 0 24px" }}>
              에러 코드: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                background: "#1e6fdc",
                color: "white",
                border: "none",
                borderRadius: 4,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              다시 시도
            </button>
            <Link href="/" style={{
              padding: "10px 20px",
              background: "white",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: 4,
              fontSize: 14,
              textDecoration: "none",
            }}>
              홈으로
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
