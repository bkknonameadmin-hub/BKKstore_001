import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { assertAdminApi } from "@/lib/admin-guard";
import {
  currentYearMonth, monthRange, getSummary, getDaily,
  getProviderBreakdown, getTopProducts, getCategoryBreakdown, getOrdersDetail,
} from "@/lib/reports";

/**
 * 매출 정산 엑셀 다운로드
 * GET /api/admin/reports/excel?month=2026-05
 *
 * 5시트: 요약 / 일별 / 결제수단 / 카테고리 / 상품TOP / 주문상세
 */
export async function GET(req: NextRequest) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const sp = req.nextUrl.searchParams;
  const month = sp.get("month") || currentYearMonth();
  const fromStr = sp.get("from");
  const toStr = sp.get("to");

  let range;
  let filenameLabel = month;
  if (fromStr && toStr) {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    to.setHours(23, 59, 59, 999);
    range = { from, to };
    filenameLabel = `${fromStr}_${toStr}`;
  } else {
    range = monthRange(month);
  }

  const [summary, daily, providers, topProducts, categories, ordersDetail] = await Promise.all([
    getSummary(range),
    getDaily(range),
    getProviderBreakdown(range),
    getTopProducts(range, 100),
    getCategoryBreakdown(range),
    getOrdersDetail(range),
  ]);

  const wb = XLSX.utils.book_new();

  // ==== 시트 1: 요약 ====
  const t = summary.totals;
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["매출 정산 리포트"],
    ["기간", `${summary.range.from} ~ ${summary.range.to}`],
    ["생성일시", new Date().toISOString().slice(0, 19).replace("T", " ")],
    [],
    ["[총괄 지표]"],
    ["항목", "금액 (원)"],
    ["총매출 (Gross)", t.grossRevenue],
    ["환불액", -t.refundedAmount],
    ["순매출 (Net)", t.netRevenue],
    [],
    ["[주문]"],
    ["주문수 (결제완료 이상)", t.orderCount],
    ["취소/환불 주문수", t.refundedOrderCount],
    ["객단가 (AOV)", t.averageOrderValue],
    [],
    ["[부가 항목]"],
    ["배송비 합계", t.shippingFee],
    ["쿠폰 할인", -t.couponDiscount],
    ["적립금 사용", -t.pointUsed],
    ["적립금 적립", t.pointEarned],
  ]);
  summarySheet["!cols"] = [{ wch: 30 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "요약");

  // ==== 시트 2: 일별 ====
  const dailyHeaders = ["날짜", "주문수", "총매출", "환불액", "순매출", "쿠폰할인", "적립금사용", "배송비"];
  const dailyData = daily.map((d) => [
    d.date, d.orderCount, d.grossRevenue, d.refundedAmount, d.netRevenue,
    d.couponDiscount, d.pointUsed, d.shippingFee,
  ]);
  // 합계 행
  const totalsRow = [
    "합계",
    daily.reduce((s, d) => s + d.orderCount, 0),
    daily.reduce((s, d) => s + d.grossRevenue, 0),
    daily.reduce((s, d) => s + d.refundedAmount, 0),
    daily.reduce((s, d) => s + d.netRevenue, 0),
    daily.reduce((s, d) => s + d.couponDiscount, 0),
    daily.reduce((s, d) => s + d.pointUsed, 0),
    daily.reduce((s, d) => s + d.shippingFee, 0),
  ];
  const dailySheet = XLSX.utils.aoa_to_sheet([dailyHeaders, ...dailyData, [], totalsRow]);
  dailySheet["!cols"] = [
    { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, dailySheet, "일별");

  // ==== 시트 3: 결제수단별 ====
  const providerSheet = XLSX.utils.aoa_to_sheet([
    ["결제수단", "주문수", "매출 (원)", "비중 (%)"],
    ...providers.map((p) => [
      p.provider, p.orderCount, p.amount,
      t.grossRevenue > 0 ? Math.round((p.amount / t.grossRevenue) * 1000) / 10 : 0,
    ]),
  ]);
  providerSheet["!cols"] = [{ wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, providerSheet, "결제수단별");

  // ==== 시트 4: 카테고리별 ====
  const categorySheet = XLSX.utils.aoa_to_sheet([
    ["카테고리", "판매수량", "매출 (원)", "비중 (%)"],
    ...categories.map((c) => [
      c.name, c.orderItemCount, c.amount,
      t.grossRevenue > 0 ? Math.round((c.amount / t.grossRevenue) * 1000) / 10 : 0,
    ]),
  ]);
  categorySheet["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 16 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, categorySheet, "카테고리별");

  // ==== 시트 5: 상품 TOP 100 ====
  const topSheet = XLSX.utils.aoa_to_sheet([
    ["순위", "SKU", "상품명", "브랜드", "카테고리", "판매수량", "매출 (원)"],
    ...topProducts.map((p, i) => [
      i + 1, p.sku, p.name, p.brand || "", p.category, p.quantity, p.amount,
    ]),
  ]);
  topSheet["!cols"] = [
    { wch: 6 }, { wch: 14 }, { wch: 36 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, topSheet, "상품TOP100");

  // ==== 시트 6: 주문 상세 (행 단위 = 주문상품) ====
  const detailSheet = XLSX.utils.aoa_to_sheet([
    [
      "결제일시", "주문번호", "상태", "주문자", "이메일",
      "상품명", "SKU", "카테고리", "옵션",
      "수량", "단가", "상품금액",
      "쿠폰할인(주문)", "적립금사용(주문)", "배송비(주문)", "환불액(주문)",
      "결제수단", "PG거래번호",
    ],
    ...ordersDetail.map((r) => [
      r.paidAt, r.orderNo, r.status, r.customerName, r.customerEmail,
      r.productName, r.sku, r.category, r.variantName,
      r.quantity, r.unitPrice, r.itemTotal,
      r.couponDiscount, r.pointUsed, r.shippingFee, r.refundedAmount,
      r.provider, r.providerTxnId,
    ]),
  ]);
  detailSheet["!cols"] = [
    { wch: 19 }, { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 22 },
    { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
    { wch: 8 }, { wch: 12 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
    { wch: 10 }, { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, detailSheet, "주문상세");

  // 바이너리 생성 + 응답
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `매출정산_${filenameLabel}.xlsx`;
  // RFC 5987 인코딩 (한글 파일명 지원)
  const encoded = encodeURIComponent(filename);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="report.xlsx"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store",
    },
  });
}
