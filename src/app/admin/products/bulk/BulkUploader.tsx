"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  HEADER_DEFINITIONS,
  TEMPLATE_ORDER,
  normalizeRow,
  type StandardKey,
} from "@/lib/bulk-headers";

type Category = { id: string; name: string; slug: string; parentId: string | null };

type RawRow = Record<StandardKey, string>;

type ValidatedRow = {
  index: number;          // 엑셀 기준 행번호
  raw: RawRow;
  ok: boolean;
  errors: string[];
  willUpdate: boolean;
};

export default function BulkUploader({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [filename, setFilename] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; failed: number; errors: string[] } | null>(null);

  const slugSet = new Set(categories.map((c) => c.slug));

  /** 파일에서 행 배열 읽기 (CSV/XLSX 자동 감지) */
  const readFile = async (file: File): Promise<RawRow[]> => {
    const ext = file.name.toLowerCase().split(".").pop();

    if (ext === "csv") {
      return new Promise((resolve, reject) => {
        Papa.parse<Record<string, any>>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (parsed) => resolve((parsed.data as Record<string, any>[]).map(normalizeRow)),
          error: (err) => reject(err),
        });
      });
    }

    if (ext === "xlsx" || ext === "xls") {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });

      // 시트 선택: "상품등록" 시트 우선, 없으면 첫 번째
      const sheetName = wb.SheetNames.find((n) => n.includes("상품")) || wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      if (!sheet) throw new Error("엑셀 시트를 찾을 수 없습니다.");

      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
        defval: "",
        raw: false,
        blankrows: false,
      });
      return json.map(normalizeRow);
    }

    throw new Error("지원하지 않는 파일 형식입니다. (.csv, .xlsx, .xls)");
  };

  /** 행별 유효성 검증 (+ 기존 SKU 조회로 신규/수정 판별) */
  const validate = async (rawRows: RawRow[]): Promise<ValidatedRow[]> => {
    const skus = rawRows.map((r) => (r.sku || "").trim()).filter(Boolean);
    const existing = await fetch("/api/admin/products/bulk/check-sku", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skus }),
    }).then((r) => r.json()).catch(() => ({ existing: [] }));
    const existSet = new Set<string>(existing.existing || []);

    return rawRows.map((row, i): ValidatedRow => {
      const errors: string[] = [];
      const sku = (row.sku || "").trim();
      const name = (row.name || "").trim();
      const categorySlug = (row.categorySlug || "").trim();
      const price = Number(row.price);
      const salePriceStr = (row.salePrice || "").trim();
      const stock = Number(row.stock);

      if (!sku) errors.push("상품코드 누락");
      if (!name) errors.push("상품명 누락");
      if (!categorySlug) errors.push("카테고리코드 누락");
      else if (!slugSet.has(categorySlug)) errors.push(`존재하지 않는 카테고리: ${categorySlug}`);
      if (!Number.isFinite(price) || price < 0) errors.push("판매가 오류");
      if (salePriceStr) {
        const sp = Number(salePriceStr);
        if (!Number.isFinite(sp) || sp < 0) errors.push("할인가 오류");
        else if (sp >= price) errors.push("할인가가 판매가 이상");
      }
      if (!Number.isFinite(stock) || stock < 0) errors.push("재고수량 오류");

      return {
        index: i + 2, // 헤더 1행 다음부터
        raw: row,
        ok: errors.length === 0,
        errors,
        willUpdate: existSet.has(sku),
      };
    });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setResult(null);
    setRows([]);
    try {
      const raw = await readFile(file);
      const validated = await validate(raw);
      setRows(validated);
    } catch (e: any) {
      alert("파일 읽기 실패: " + e.message);
    }
  };

  const submit = async () => {
    const ok = rows.filter((r) => r.ok);
    if (ok.length === 0) { alert("등록 가능한 행이 없습니다."); return; }
    if (!confirm(`${ok.length}건을 등록/수정합니다. 진행하시겠습니까?`)) return;

    setSubmitting(true);
    try {
      const payload = ok.map((r) => {
        const sp = (r.raw.salePrice || "").trim();
        const lst = (r.raw.lowStockThreshold || "").trim();
        return {
          sku: r.raw.sku.trim(),
          name: r.raw.name.trim(),
          brand: r.raw.brand?.trim() || null,
          description: r.raw.description?.trim() || null,
          price: Number(r.raw.price),
          salePrice: sp ? Number(sp) : null,
          stock: Number(r.raw.stock),
          lowStockThreshold: lst ? Number(lst) : null,
          categorySlug: r.raw.categorySlug.trim(),
          thumbnail: r.raw.thumbnail?.trim() || null,
          images: r.raw.images ? r.raw.images.split("|").map((s) => s.trim()).filter(Boolean) : [],
          isActive: (r.raw.isActive || "Y").trim().toUpperCase() !== "N",
          isFeatured: (r.raw.isFeatured || "N").trim().toUpperCase() === "Y",
        };
      });

      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "처리 실패");
      setResult(data);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  /** 엑셀 템플릿 다운로드 (3시트: 안내 / 상품등록 / 카테고리목록) */
  const downloadXlsxTemplate = () => {
    const wb = XLSX.utils.book_new();

    // 시트 1: 안내
    const guideRows: (string | number)[][] = [
      ["상품 일괄등록 안내"],
      [],
      ["1.  '상품등록' 시트에 한 행에 하나씩 상품 정보를 입력하세요."],
      ["2.  '카테고리목록' 시트의 슬러그(slug) 값을 '카테고리코드' 컬럼에 입력합니다."],
      ["3.  상품코드(SKU)가 이미 존재하면 자동으로 수정, 없으면 신규 등록됩니다."],
      ["4.  '추가이미지URL'은 여러 개일 경우 ' | ' (파이프) 기호로 구분하세요."],
      ["5.  Y/N 컬럼은 대문자 Y 또는 N 으로 입력합니다."],
      ["6.  파일 저장시 인코딩은 자동으로 처리됩니다 (.xlsx)."],
      [],
      ["[컬럼 설명]"],
      ["컬럼명", "필수", "설명", "예시"],
      ...(TEMPLATE_ORDER.map((k) => {
        const d = HEADER_DEFINITIONS[k];
        return [d.primaryKo, d.required ? "필수" : "선택", d.description, d.example] as (string | number)[];
      })),
    ];
    const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);
    guideSheet["!cols"] = [{ wch: 18 }, { wch: 6 }, { wch: 50 }, { wch: 36 }];
    // 제목 셀 강조 (xlsx-기본은 스타일 미지원이지만 col 너비는 적용됨)
    XLSX.utils.book_append_sheet(wb, guideSheet, "안내");

    // 시트 2: 상품등록 (헤더 + 샘플 1행)
    const headers = TEMPLATE_ORDER.map((k) => HEADER_DEFINITIONS[k].primaryKo);
    const sampleRow = TEMPLATE_ORDER.map((k) => HEADER_DEFINITIONS[k].example);
    const productSheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    productSheet["!cols"] = TEMPLATE_ORDER.map((k) => ({
      wch: k === "description" ? 40 : k === "name" ? 30 : k === "images" ? 40 : 14,
    }));
    XLSX.utils.book_append_sheet(wb, productSheet, "상품등록");

    // 시트 3: 카테고리목록
    const catRows: (string | number)[][] = [
      ["슬러그(카테고리코드)", "이름", "상위 카테고리"],
      ...categories.map((c) => {
        const parent = categories.find((p) => p.id === c.parentId);
        return [c.slug, c.name, parent ? parent.name : "(최상위)"];
      }),
    ];
    const catSheet = XLSX.utils.aoa_to_sheet(catRows);
    catSheet["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, catSheet, "카테고리목록");

    XLSX.writeFile(wb, "상품_일괄등록_템플릿.xlsx");
  };

  /** 검증 실패 행만 모아서 엑셀로 다운로드 (작업 편의) */
  const downloadErrors = () => {
    const errs = rows.filter((r) => !r.ok);
    if (errs.length === 0) return;
    const headers = ["행번호", "오류사유", ...TEMPLATE_ORDER.map((k) => HEADER_DEFINITIONS[k].primaryKo)];
    const data = errs.map((r) => [r.index, r.errors.join(", "), ...TEMPLATE_ORDER.map((k) => r.raw[k] || "")]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "오류행");
    XLSX.writeFile(wb, "일괄등록_오류행.xlsx");
  };

  /** 기존 CSV 템플릿도 그대로 제공 */
  const downloadCsvTemplate = () => {
    const headers = TEMPLATE_ORDER.map((k) => HEADER_DEFINITIONS[k].primaryKo);
    const sample = TEMPLATE_ORDER.map((k) => HEADER_DEFINITIONS[k].example);
    const csv = Papa.unparse({ fields: headers, data: [sample] });
    // 엑셀에서 한글이 깨지지 않도록 BOM 추가
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "상품_일괄등록_템플릿.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const okCount = rows.filter((r) => r.ok).length;
  const errorCount = rows.length - okCount;
  const updateCount = rows.filter((r) => r.ok && r.willUpdate).length;
  const createCount = okCount - updateCount;

  return (
    <div className="space-y-4">
      {/* 안내 + 템플릿 */}
      <section className="bg-white rounded border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <h2 className="font-bold mb-2">엑셀/CSV 일괄등록 안내</h2>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li><b>엑셀(.xlsx)</b> 또는 <b>CSV</b> 파일 모두 지원합니다.</li>
              <li>한 번에 최대 2,000행까지 등록/수정할 수 있습니다.</li>
              <li>컬럼 헤더는 한글(예: <span className="font-mono">상품명</span>) 또는 영문(<span className="font-mono">name</span>) 모두 인식합니다.</li>
              <li><b>상품코드(SKU)</b>가 이미 존재하면 자동으로 수정, 없으면 신규 등록됩니다.</li>
              <li><b>카테고리코드</b>는 카테고리 슬러그(<span className="font-mono">rod-sea</span> 등) 값을 입력합니다. 템플릿의 [카테고리목록] 시트 참고.</li>
              <li>여러 추가이미지는 <code className="font-mono">|</code> (파이프) 로 구분합니다.</li>
              <li>판매여부/추천상품은 <code>Y</code> 또는 <code>N</code> 으로 입력합니다 (기본: Y/N).</li>
            </ul>
          </div>
          <div className="flex flex-col gap-2 min-w-[180px]">
            <button onClick={downloadXlsxTemplate} className="btn-primary text-xs h-9">📊 엑셀 템플릿</button>
            <button onClick={downloadCsvTemplate} className="btn-outline text-xs h-9">📄 CSV 템플릿</button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-bold mb-2">컬럼 명세</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-gray-100">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-2 py-1.5 w-32">컬럼명 (한글)</th>
                  <th className="text-left px-2 py-1.5 w-28 font-mono">영문 키</th>
                  <th className="text-center px-2 py-1.5 w-12">필수</th>
                  <th className="text-left px-2 py-1.5">설명</th>
                  <th className="text-left px-2 py-1.5 w-40">예시</th>
                </tr>
              </thead>
              <tbody>
                {TEMPLATE_ORDER.map((k) => {
                  const d = HEADER_DEFINITIONS[k];
                  return (
                    <tr key={k} className="border-t border-gray-100">
                      <td className="px-2 py-1.5 font-medium">{d.primaryKo}</td>
                      <td className="px-2 py-1.5 font-mono text-gray-500">{k}</td>
                      <td className="px-2 py-1.5 text-center">
                        {d.required ? <span className="text-red-500 font-bold">필수</span> : <span className="text-gray-400">선택</span>}
                      </td>
                      <td className="px-2 py-1.5 text-gray-600">{d.description}</td>
                      <td className="px-2 py-1.5 font-mono text-gray-500 truncate max-w-[160px]">{d.example}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 파일 선택 */}
      <section className="bg-white rounded border border-gray-200 p-5">
        <label className="btn-primary inline-block cursor-pointer">
          📂 파일 선택 (.xlsx / .csv)
          <input type="file" accept=".xlsx,.xls,.csv,text/csv" hidden onChange={onFile} />
        </label>
        {filename && <span className="ml-3 text-sm text-gray-600">{filename} · {rows.length}행</span>}
      </section>

      {/* 미리보기 */}
      {rows.length > 0 && (
        <section className="bg-white rounded border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-wrap gap-2">
            <div className="text-sm">
              <span>미리보기 ({rows.length}행)</span>
              <span className="ml-3 text-brand-600">신규 {createCount}</span>
              <span className="ml-2 text-amber-600">수정 {updateCount}</span>
              {errorCount > 0 && <span className="ml-2 text-red-500">오류 {errorCount}</span>}
            </div>
            <div className="flex gap-2">
              {errorCount > 0 && (
                <button onClick={downloadErrors} className="btn-outline text-xs h-9">⚠️ 오류행 다운로드</button>
              )}
              <button onClick={submit} disabled={submitting || okCount === 0} className="btn-primary text-sm h-9">
                {submitting ? "처리 중..." : `${okCount}건 등록/수정`}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1200px]">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-2 py-2 w-10">행</th>
                  <th className="px-2 py-2 w-16">상태</th>
                  <th className="px-2 py-2 w-32">상품코드</th>
                  <th className="px-2 py-2">상품명</th>
                  <th className="px-2 py-2 w-24">카테고리</th>
                  <th className="px-2 py-2 w-20 text-right">판매가</th>
                  <th className="px-2 py-2 w-20 text-right">할인가</th>
                  <th className="px-2 py-2 w-16 text-right">재고</th>
                  <th className="px-2 py-2">메시지</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={i} className={`border-t border-gray-100 ${!r.ok ? "bg-red-50" : ""}`}>
                    <td className="px-2 py-1.5 text-gray-400">{r.index}</td>
                    <td className="px-2 py-1.5">
                      {r.ok ? (
                        r.willUpdate ?
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">수정</span> :
                          <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">신규</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700">오류</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 font-mono">{r.raw.sku}</td>
                    <td className="px-2 py-1.5 truncate max-w-xs">{r.raw.name}</td>
                    <td className="px-2 py-1.5 font-mono">{r.raw.categorySlug}</td>
                    <td className="px-2 py-1.5 text-right">{r.raw.price}</td>
                    <td className="px-2 py-1.5 text-right">{r.raw.salePrice || "-"}</td>
                    <td className="px-2 py-1.5 text-right">{r.raw.stock}</td>
                    <td className="px-2 py-1.5 text-red-600">{r.errors.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 200 && <p className="p-3 text-xs text-gray-500">처음 200행만 미리보기로 표시 중. 전체 {rows.length}행이 처리됩니다.</p>}
          </div>
        </section>
      )}

      {/* 결과 */}
      {result && (
        <section className="bg-white rounded border border-gray-200 p-5">
          <h2 className="font-bold mb-2">처리 결과</h2>
          <ul className="text-sm space-y-1">
            <li>✅ 신규 등록: <b>{result.created}</b>건</li>
            <li>♻️ 수정: <b>{result.updated}</b>건</li>
            {result.failed > 0 && <li>❌ 실패: <b className="text-red-500">{result.failed}</b>건</li>}
          </ul>
          {result.errors?.length > 0 && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-gray-500">실패 사유 보기</summary>
              <ul className="mt-2 space-y-0.5 text-red-600">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
