import sharp from "sharp";

/**
 * 이미지 처리 유틸 (sharp 기반)
 * - HEIC/HEIF → JPEG 자동 변환 (아이폰 호환)
 * - 다중 사이즈 자동 생성 (썸네일/중간/원본)
 * - WebP 변환 옵션
 * - EXIF 자동 회전 + 위치/카메라 정보 제거
 */

export type ImageVariant = {
  name: string;        // "thumb" | "medium" | "large"
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
  contentType: string;
  ext: string;
};

const SIZES = [
  { name: "thumb",  maxWidth: 240,  quality: 80 },
  { name: "medium", maxWidth: 800,  quality: 85 },
  { name: "large",  maxWidth: 2000, quality: 90 },
];

const HEIC_TYPES = ["image/heic", "image/heif"];

/**
 * 입력 이미지 → 다중 사이즈 + WebP 변환
 * @param input 원본 바이너리
 * @param contentType 원본 MIME (HEIC 처리용)
 * @param options.preferWebp - WebP로 출력 (기본 true), false면 JPEG
 */
export async function processImage(
  input: Buffer,
  contentType: string,
  options: { preferWebp?: boolean; sizes?: typeof SIZES } = {}
): Promise<ImageVariant[]> {
  const useWebp = options.preferWebp !== false;
  const sizes = options.sizes || SIZES;

  // sharp 는 HEIC 를 알아서 디코딩 (libvips HEIC 빌드시)
  // 실패시 JPEG fallback
  let pipeline = sharp(input, { failOn: "none" }).rotate(); // EXIF 자동 회전
  pipeline = pipeline.withMetadata({ exif: {} as any });   // EXIF 제거 (위치/카메라 정보)

  // HEIC 는 항상 JPEG/WebP 로 변환
  const isHeic = HEIC_TYPES.includes(contentType.toLowerCase());

  const results: ImageVariant[] = [];
  for (const s of sizes) {
    const cloned = pipeline.clone().resize({
      width: s.maxWidth,
      height: s.maxWidth,
      fit: "inside",
      withoutEnlargement: true,  // 작은 이미지는 키우지 않음
    });

    let buffer: Buffer;
    let ext: string;
    let mime: string;

    if (useWebp) {
      buffer = await cloned.webp({ quality: s.quality, effort: 4 }).toBuffer();
      ext = "webp"; mime = "image/webp";
    } else {
      buffer = await cloned.jpeg({ quality: s.quality, progressive: true, mozjpeg: true }).toBuffer();
      ext = "jpg"; mime = "image/jpeg";
    }

    const meta = await sharp(buffer).metadata();
    results.push({
      name: s.name,
      buffer,
      width: meta.width || 0,
      height: meta.height || 0,
      size: buffer.length,
      contentType: mime,
      ext,
    });
  }

  return results;
}

/**
 * 단일 사이즈만 필요할때 (간단 처리)
 */
export async function resizeImage(
  input: Buffer,
  maxWidth: number,
  options: { quality?: number; format?: "jpeg" | "webp" } = {}
): Promise<{ buffer: Buffer; ext: string; contentType: string }> {
  const quality = options.quality || 85;
  const format = options.format || "webp";

  let p = sharp(input, { failOn: "none" })
    .rotate()
    .withMetadata({ exif: {} as any })
    .resize({ width: maxWidth, height: maxWidth, fit: "inside", withoutEnlargement: true });

  if (format === "webp") {
    return { buffer: await p.webp({ quality, effort: 4 }).toBuffer(), ext: "webp", contentType: "image/webp" };
  }
  return { buffer: await p.jpeg({ quality, progressive: true, mozjpeg: true }).toBuffer(), ext: "jpg", contentType: "image/jpeg" };
}

/** HEIC 여부 확인 */
export function isHeic(contentType: string): boolean {
  return HEIC_TYPES.includes(contentType.toLowerCase());
}
