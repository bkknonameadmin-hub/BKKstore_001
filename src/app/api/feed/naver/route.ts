import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCachedNaverFeed, generateNaverFeed } from "@/lib/naver-feed";

/**
 * 네이버 쇼핑 EP 피드 엔드포인트
 *
 * GET /api/feed/naver              → TSV (5분 캐시)
 * GET /api/feed/naver?download=1   → 첨부 다운로드 헤더
 * GET /api/feed/naver?fresh=1      → 캐시 무시 (관리자 점검용)
 * GET /api/feed/naver?stats=1      → JSON 통계 (점검용)
 *
 * 네이버 크롤러는 ETag/If-None-Match 를 사용하므로 동일 피드는 304 반환
 *
 * Public 엔드포인트 (네이버가 호출). 인증 불필요.
 * 단, 비공개 운영을 원하면 NAVER_FEED_ACCESS_TOKEN 으로 보호 가능.
 */
export async function GET(req: NextRequest) {
  // 선택적 토큰 보호 (env 미설정시 공개)
  const requiredToken = process.env.NAVER_FEED_ACCESS_TOKEN;
  if (requiredToken) {
    const provided = req.nextUrl.searchParams.get("token") || req.headers.get("x-feed-token");
    if (provided !== requiredToken) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const sp = req.nextUrl.searchParams;
  const fresh = sp.get("fresh") === "1";
  const download = sp.get("download") === "1";
  const wantStats = sp.get("stats") === "1";
  const includeOos = sp.get("oos") === "1";

  try {
    let tsv: string, stats: Awaited<ReturnType<typeof generateNaverFeed>>["stats"];

    if (includeOos) {
      // 재고 0 포함 옵션은 캐시 안 함 (드물게 점검용)
      const r = await generateNaverFeed({ includeOutOfStock: true });
      tsv = r.tsv; stats = r.stats;
    } else {
      const c = await getCachedNaverFeed(fresh);
      tsv = c.tsv; stats = c.stats;
    }

    if (wantStats) {
      return NextResponse.json({ ok: true, stats });
    }

    // ETag (캐시 신선도 검증)
    const etag = `W/"${crypto.createHash("sha1").update(tsv).digest("hex").slice(0, 16)}"`;
    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    const headers: Record<string, string> = {
      "Content-Type": "text/tab-separated-values; charset=utf-8",
      "Content-Length": String(stats.bytes),
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "ETag": etag,
      "X-Feed-Generated-At": stats.generatedAt.toISOString(),
      "X-Feed-Active-Count": String(stats.active),
      "X-Feed-Excluded-Count": String(stats.excluded),
    };
    if (download) {
      headers["Content-Disposition"] = `attachment; filename="naver-shopping-feed.tsv"`;
    }

    return new NextResponse(tsv, { status: 200, headers });
  } catch (e: any) {
    console.error("[naver-feed]", e);
    return NextResponse.json({ error: e.message || "피드 생성 실패" }, { status: 500 });
  }
}
