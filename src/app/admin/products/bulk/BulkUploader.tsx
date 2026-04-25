"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Papa from "papaparse";

type Category = { id: string; name: string; slug: string; parentId: string | null };

type Row = {
  sku: string;
  name: string;
  brand?: string;
  description?: string;
  price: string;
  salePrice?: string;
  stock: string;
  categorySlug: string;
  thumbnail?: string;
  images?: string;       // 콤마(|) 구분
  isActive?: string;     // "Y"/"N"
  isFeatured?: string;   // "Y"/"N"
};

type ValidatedRow = {
  index: number;
  raw: Row;
  ok: boolean;
  errors: string[];
  willUpdate: boolean;
};

const TEMPLATE_HEADER = [
  "sku", "name", "brand", "description", "price", "salePrice",
  "stock", "categorySlug", "thumbnail", "images", "isActive", "isFeatured",
];

const TEMPLATE_SAMPLE = [
  ["SKU-DEMO-001", "샘플 낚싯대", "오션마스터", "테스트 상품", "85000", "75000", "30", "rod-sea", "/images/placeholder.svg", "", "Y", "N"],
];

export default function BulkUploader({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [filename, setFilename] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; failed: number; errors: string[] } | null>(null);

  const slugSet = new Set(categories.map((c) => c.slug));
  const validate = async (rawRows: Row[]) => {
    // 기존 SKU 조회 (업데이트 여부 결정용)
    const skus = rawRows.map((r) => r.sku?.trim()).filter(Boolean);
    const existing = await fetch("/api/admin/products/bulk/check-sku", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skus }),
    }).then((r) => r.json()).catch(() => ({ existing: [] }));
    const existSet = new Set<string>(existing.existing || []);

    return rawRows.map((row, i): ValidatedRow => {
      const errors: string[] = [];
      if (!row.sku?.trim()) errors.push("SKU 누락");
      if (!row.name?.trim()) errors.push("상품명 누락");
      if (!row.categorySlug || !slugSet.has(row.categorySlug.trim())) errors.push(`존재하지 않는 카테고리: ${row.categorySlug}`);
      const price = Number(row.price);
      if (!Number.isFinite(price) || price < 0) errors.push("판매가 오류");
      if (row.salePrice) {
        const sp = Number(row.salePrice);
        if (!Number.isFinite(sp) || sp < 0) errors.push("할인가 오류");
        else if (sp >= price) errors.push("할인가가 판매가 이상");
      }
      const stock = Number(row.stock);
      if (!Number.isFinite(stock) || stock < 0) errors.push("재고 오류");

      return {
        index: i + 2, // CSV 1행은 헤더
        raw: row,
        ok: errors.length === 0,
        errors,
        willUpdate: existSet.has(row.sku?.trim()),
      };
    });
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setResult(null);

    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        const validated = await validate(parsed.data as Row[]);
        setRows(validated);
      },
      error: (err) => {
        alert("CSV 파싱 실패: " + err.message);
      },
    });
  };

  const submit = async () => {
    const ok = rows.filter((r) => r.ok);
    if (ok.length === 0) { alert("등록 가능한 행이 없습니다."); return; }
    if (!confirm(`${ok.length}건을 등록/수정합니다. 진행하시겠습니까?`)) return;

    setSubmitting(true);
    try {
      const payload = ok.map((r) => ({
        sku: r.raw.sku.trim(),
        name: r.raw.name.trim(),
        brand: r.raw.brand?.trim() || null,
        description: r.raw.description?.trim() || null,
        price: Number(r.raw.price),
        salePrice: r.raw.salePrice ? Number(r.raw.salePrice) : null,
        stock: Number(r.raw.stock),
        categorySlug: r.raw.categorySlug.trim(),
        thumbnail: r.raw.thumbnail?.trim() || null,
        images: r.raw.images ? r.raw.images.split("|").map((s) => s.trim()).filter(Boolean) : [],
        isActive: r.raw.isActive?.trim().toUpperCase() !== "N",
        isFeatured: r.raw.isFeatured?.trim().toUpperCase() === "Y",
      }));

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

  const downloadTemplate = () => {
    const csv = Papa.unparse({ fields: TEMPLATE_HEADER, data: TEMPLATE_SAMPLE });
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "products-template.csv";
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
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold mb-2">CSV 형식 안내</h2>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li><b>UTF-8 인코딩</b> 필수 (엑셀 저장시: 다른 이름으로 저장 → CSV UTF-8)</li>
              <li>헤더 행은 다음 컬럼명을 사용해주세요: <span className="font-mono">{TEMPLATE_HEADER.join(", ")}</span></li>
              <li>SKU가 이미 존재하면 <b>수정</b>, 없으면 <b>신규 등록</b>됩니다.</li>
              <li><span className="font-mono">categorySlug</span>: 카테고리 슬러그 (예: rod-sea, reel-spinning)</li>
              <li><span className="font-mono">images</span>: 여러 URL은 <code className="font-mono">|</code> 로 구분</li>
              <li><span className="font-mono">isActive / isFeatured</span>: <code>Y</code> 또는 <code>N</code></li>
            </ul>
          </div>
          <button onClick={downloadTemplate} className="btn-outline text-xs h-9">📄 템플릿 다운로드</button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-bold mb-2">사용 가능한 카테고리 슬러그</h3>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {categories.map((c) => (
              <span key={c.id} className="px-2 py-0.5 rounded bg-gray-100 font-mono">{c.slug} <span className="text-gray-400">({c.name})</span></span>
            ))}
          </div>
        </div>
      </section>

      {/* 파일 선택 */}
      <section className="bg-white rounded border border-gray-200 p-5">
        <label className="btn-primary inline-block cursor-pointer">
          📂 CSV 파일 선택
          <input type="file" accept=".csv,text/csv" hidden onChange={onFile} />
        </label>
        {filename && <span className="ml-3 text-sm text-gray-600">{filename} · {rows.length}행</span>}
      </section>

      {/* 미리보기 */}
      {rows.length > 0 && (
        <section className="bg-white rounded border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="text-sm">
              <span>미리보기 ({rows.length}행)</span>
              <span className="ml-3 text-brand-600">신규 {createCount}</span>
              <span className="ml-2 text-amber-600">수정 {updateCount}</span>
              {errorCount > 0 && <span className="ml-2 text-red-500">오류 {errorCount}</span>}
            </div>
            <button onClick={submit} disabled={submitting || okCount === 0} className="btn-primary text-sm h-9">
              {submitting ? "처리 중..." : `${okCount}건 등록/수정`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1100px]">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-2 py-2 w-10">행</th>
                  <th className="px-2 py-2 w-16">상태</th>
                  <th className="px-2 py-2 w-32">SKU</th>
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
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-2 py-1.5 text-gray-400">{r.index}</td>
                    <td className="px-2 py-1.5">
                      {r.ok ? (
                        r.willUpdate ?
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">수정</span> :
                          <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">신규</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600">오류</span>
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
