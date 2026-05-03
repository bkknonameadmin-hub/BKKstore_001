"use client";
import { useState } from "react";

type Props = { month: string; from?: string; to?: string };

export default function ExcelDownloadButton({ month, from, to }: Props) {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from && to) {
        params.set("from", from);
        params.set("to", to);
      } else {
        params.set("month", month);
      }
      const res = await fetch(`/api/admin/reports/excel?${params.toString()}`);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "다운로드 실패");
      }
      const blob = await res.blob();
      // Content-Disposition 헤더에서 파일명 추출
      const cd = res.headers.get("content-disposition") || "";
      const m = /filename\*?=(?:UTF-8'')?["']?([^;"']+)/i.exec(cd);
      const filename = m ? decodeURIComponent(m[1]) : `매출정산_${from && to ? `${from}_${to}` : month}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || "엑셀 다운로드 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={download} disabled={loading} className="btn-primary h-9 text-sm">
      {loading ? "생성 중..." : "📊 엑셀 다운로드"}
    </button>
  );
}
