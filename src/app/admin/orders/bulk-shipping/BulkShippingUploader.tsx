"use client";
import { useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

type Row = { orderNo: string; courier: string; trackingNo: string };
type RowResult = Row & { ok: boolean; error?: string };

const TEMPLATE_HEADERS = ["orderNo", "courier", "trackingNo"];
const COURIERS = ["CJ대한통운", "한진택배", "롯데택배", "우체국택배", "로젠택배", "쿠팡로지스틱스"];

export default function BulkShippingUploader() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filename, setFilename] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ updated: number; skipped: number; errors: string[] } | null>(null);

  const parseFile = async (file: File): Promise<Row[]> => {
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext === "csv") {
      return new Promise((resolve, reject) => {
        Papa.parse<Record<string, string>>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (r) => resolve(r.data.map((x) => ({
            orderNo: (x.orderNo || x["주문번호"] || "").trim(),
            courier: (x.courier || x["택배사"] || "").trim(),
            trackingNo: (x.trackingNo || x["송장번호"] || "").trim(),
          })).filter((r) => r.orderNo && r.courier && r.trackingNo)),
          error: reject,
        });
      });
    }
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
    return json.map((x) => ({
      orderNo: String(x.orderNo || x["주문번호"] || "").trim(),
      courier: String(x.courier || x["택배사"] || "").trim(),
      trackingNo: String(x.trackingNo || x["송장번호"] || "").trim(),
    })).filter((r) => r.orderNo && r.courier && r.trackingNo);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setResult(null);
    try {
      const data = await parseFile(file);
      setRows(data);
    } catch (e: any) {
      alert("파일 읽기 실패: " + e.message);
    }
  };

  const submit = async () => {
    if (rows.length === 0) return;
    if (!confirm(`${rows.length}건의 송장을 등록하고 알림톡을 발송합니다. 진행하시겠습니까?`)) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/orders/bulk-shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "처리 실패");
      setResult(data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["orderNo", "courier", "trackingNo"],
      ["ORD-20260501-XYZ12", "CJ대한통운", "1234567890"],
    ]);
    sheet["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, sheet, "송장");
    XLSX.writeFile(wb, "송장_일괄등록_템플릿.xlsx");
  };

  return (
    <div className="space-y-4">
      <section className="bg-white rounded border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <h2 className="font-bold mb-2 text-sm">📋 사용 안내</h2>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li><b>3개 컬럼</b> 필수: orderNo (주문번호), courier (택배사), trackingNo (송장번호)</li>
              <li>컬럼명은 한글 (주문번호/택배사/송장번호)도 인식</li>
              <li>지원: <b>택배사</b> — {COURIERS.join(", ")}</li>
              <li>처리 가능 상태: <b>PAID, PREPARING</b> 만 (이미 SHIPPED 등은 제외)</li>
              <li>처리 후 자동으로 <b>알림톡</b> 발송 (배송조회 버튼 포함)</li>
            </ul>
          </div>
          <button onClick={downloadTemplate} className="btn-outline text-xs h-9">📊 템플릿 다운로드</button>
        </div>
      </section>

      <section className="bg-white rounded border border-gray-200 p-5">
        <label className="btn-primary inline-block cursor-pointer">
          📂 파일 선택 (.xlsx / .csv)
          <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={onFile} />
        </label>
        {filename && <span className="ml-3 text-sm text-gray-600">{filename} · {rows.length}행</span>}
      </section>

      {rows.length > 0 && (
        <section className="bg-white rounded border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <span className="text-sm">미리보기 ({rows.length}행)</span>
            <button onClick={submit} disabled={submitting} className="btn-primary text-sm h-9">
              {submitting ? "처리 중..." : `${rows.length}건 발송 처리`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2 w-44">주문번호</th>
                  <th className="text-left px-3 py-2 w-32">택배사</th>
                  <th className="text-left px-3 py-2">송장번호</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 font-mono">{r.orderNo}</td>
                    <td className="px-3 py-1.5">{r.courier}</td>
                    <td className="px-3 py-1.5 font-mono">{r.trackingNo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 && <p className="p-3 text-xs text-gray-500">처음 100행만 표시 중. 전체 {rows.length}행이 처리됩니다.</p>}
          </div>
        </section>
      )}

      {result && (
        <section className="bg-white rounded border border-gray-200 p-5">
          <h2 className="font-bold mb-2 text-sm">처리 결과</h2>
          <ul className="text-sm space-y-1">
            <li>✅ 발송 처리: <b>{result.updated}</b>건</li>
            {result.skipped > 0 && <li>⏭ 건너뜀: <b>{result.skipped}</b>건</li>}
          </ul>
          {result.errors?.length > 0 && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-gray-500">건너뛴 사유</summary>
              <ul className="mt-2 space-y-0.5 text-amber-700">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
