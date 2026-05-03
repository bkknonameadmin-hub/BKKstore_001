import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/admin-guard";
import { invalidateNaverFeedCache, getCachedNaverFeed } from "@/lib/naver-feed";

/**
 * 네이버 EP 피드 캐시 즉시 무효화 + 재생성
 * 상품 대량 등록/수정 직후 호출하면 다음 네이버 크롤링에 즉시 반영됨
 */
export async function POST() {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  invalidateNaverFeedCache();
  const { stats } = await getCachedNaverFeed(true);
  return NextResponse.json({ ok: true, stats });
}
