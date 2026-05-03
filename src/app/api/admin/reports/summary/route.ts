import { NextRequest, NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/admin-guard";
import {
  currentYearMonth, monthRange, getSummary, getDaily,
  getProviderBreakdown, getTopProducts, getCategoryBreakdown,
} from "@/lib/reports";

/**
 * 매출 요약 조회
 * GET /api/admin/reports/summary?month=2026-05
 *   또는 from=2026-05-01&to=2026-05-31
 */
export async function GET(req: NextRequest) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const sp = req.nextUrl.searchParams;
  const month = sp.get("month") || currentYearMonth();
  const fromStr = sp.get("from");
  const toStr = sp.get("to");

  let range;
  if (fromStr && toStr) {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    to.setHours(23, 59, 59, 999);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: "from/to 형식 오류" }, { status: 400 });
    }
    range = { from, to };
  } else {
    range = monthRange(month);
  }

  const [summary, daily, providers, topProducts, categories] = await Promise.all([
    getSummary(range),
    getDaily(range),
    getProviderBreakdown(range),
    getTopProducts(range, 20),
    getCategoryBreakdown(range),
  ]);

  return NextResponse.json({
    summary,
    daily,
    providers,
    topProducts,
    categories,
  });
}
