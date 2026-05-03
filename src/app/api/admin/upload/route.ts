import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { assertAdminApi } from "@/lib/admin-guard";
import { getStorage } from "@/lib/storage";
import { processImage, isHeic } from "@/lib/image";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
const MAX_BYTES = 15 * 1024 * 1024; // 15MB (HEIC 원본 대응)

/**
 * 상품 이미지 업로드 (Admin)
 * - sharp 자동 처리: EXIF 회전 + EXIF 제거 + 다중 사이즈 (thumb/medium/large)
 * - HEIC/HEIF → WebP 자동 변환 (아이폰 호환)
 * - GIF 는 sharp 가 첫 프레임만 처리하므로 원본 그대로 저장
 */
export async function POST(req: NextRequest) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "지원하지 않는 이미지 형식입니다." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "파일 용량은 15MB 이하여야 합니다." }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const id = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;

    // GIF 는 원본 보존 (애니메이션 보호)
    if (file.type === "image/gif") {
      const result = await getStorage().upload({
        buffer: buf, filename: `${id}.gif`, contentType: file.type, prefix: "products",
      });
      return NextResponse.json({ url: result.url, key: result.key });
    }

    // sharp 로 다중 사이즈 + WebP 변환
    const variants = await processImage(buf, file.type, { preferWebp: true });
    const storage = getStorage();
    const uploaded: Record<string, { url: string; size: number; width: number }> = {};

    for (const v of variants) {
      const r = await storage.upload({
        buffer: v.buffer,
        filename: `${id}-${v.name}.${v.ext}`,
        contentType: v.contentType,
        prefix: "products",
      });
      uploaded[v.name] = { url: r.url, size: v.size, width: v.width };
    }

    // 기본 url 은 medium (상세 표시용), 카드는 thumb 별도 사용 가능
    return NextResponse.json({
      url: uploaded.medium?.url || uploaded.large?.url,
      thumbnailUrl: uploaded.thumb?.url,
      mediumUrl: uploaded.medium?.url,
      largeUrl: uploaded.large?.url,
      variants: uploaded,
      heicConverted: isHeic(file.type),
    });
  } catch (e: any) {
    console.error("[admin-upload]", e);
    return NextResponse.json({ error: e.message || "업로드 실패" }, { status: 500 });
  }
}
