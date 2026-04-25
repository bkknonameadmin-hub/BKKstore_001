// 상품 일괄등록용 컬럼 헤더 매핑
// 한국형 쇼핑몰의 일반적인 일괄등록 패턴을 우리 자체 형식으로 정의합니다.
// 한글/영문 헤더 모두 인식하도록 별칭 테이블을 둡니다.

export type StandardKey =
  | "sku"
  | "name"
  | "brand"
  | "description"
  | "price"
  | "salePrice"
  | "stock"
  | "lowStockThreshold"
  | "categorySlug"
  | "thumbnail"
  | "images"
  | "isActive"
  | "isFeatured";

/** 한 표준키 = [기본 한글헤더, 영문 별칭, 한글 별칭들...] */
export const HEADER_DEFINITIONS: Record<StandardKey, {
  primaryKo: string;
  aliases: string[];
  required: boolean;
  description: string;
  example: string;
}> = {
  sku:               { primaryKo: "상품코드",          aliases: ["sku", "상품번호", "품번", "코드"],                    required: true,  description: "고유 상품번호. 동일 코드는 자동으로 수정됨", example: "SKU-00001" },
  name:              { primaryKo: "상품명",            aliases: ["name", "제품명"],                                      required: true,  description: "상품 이름",                                  example: "초경량 카본 루어대" },
  brand:             { primaryKo: "브랜드",            aliases: ["brand", "제조사"],                                     required: false, description: "브랜드명",                                   example: "오션마스터" },
  categorySlug:      { primaryKo: "카테고리코드",      aliases: ["categorySlug", "카테고리", "분류코드", "카테고리슬러그"], required: true,  description: "카테고리목록 시트의 슬러그 컬럼 값을 입력",  example: "rod-sea" },
  price:             { primaryKo: "판매가",            aliases: ["price", "정가", "가격"],                               required: true,  description: "원 단위 정수",                               example: "85000" },
  salePrice:         { primaryKo: "할인가",            aliases: ["salePrice", "특가", "행사가"],                          required: false, description: "비워두면 할인 없음. 판매가보다 낮아야 함",  example: "75000" },
  stock:             { primaryKo: "재고수량",          aliases: ["stock", "재고", "수량"],                               required: true,  description: "정수",                                       example: "30" },
  lowStockThreshold: { primaryKo: "재고알림기준",      aliases: ["lowStockThreshold", "재고임계치", "알림기준"],          required: false, description: "비워두면 글로벌 설정값 사용",                example: "5" },
  thumbnail:         { primaryKo: "대표이미지URL",     aliases: ["thumbnail", "대표이미지", "썸네일"],                    required: false, description: "이미지 URL 또는 /uploads/xxx.jpg",          example: "/images/placeholder.svg" },
  images:            { primaryKo: "추가이미지URL",     aliases: ["images", "추가이미지", "상세이미지"],                  required: false, description: "여러 URL은 | (파이프)로 구분",              example: "https://.../1.jpg | https://.../2.jpg" },
  description:       { primaryKo: "상품상세설명",      aliases: ["description", "상세설명", "설명"],                     required: false, description: "줄바꿈 가능 (엑셀에서 Alt+Enter)",          example: "고품질 카본 소재..." },
  isActive:          { primaryKo: "판매여부",          aliases: ["isActive", "노출여부", "판매상태"],                    required: false, description: "Y/N (기본 Y)",                              example: "Y" },
  isFeatured:        { primaryKo: "추천상품",          aliases: ["isFeatured", "메인노출", "추천"],                      required: false, description: "Y/N (기본 N)",                              example: "N" },
};

/** 헤더 문자열을 표준키로 변환 */
export function normalizeHeader(header: string): StandardKey | null {
  const h = (header || "").trim().toLowerCase();
  if (!h) return null;
  for (const [key, def] of Object.entries(HEADER_DEFINITIONS) as [StandardKey, typeof HEADER_DEFINITIONS[StandardKey]][]) {
    if (def.primaryKo.toLowerCase() === h) return key;
    if (key.toLowerCase() === h) return key;
    if (def.aliases.some((a) => a.toLowerCase() === h)) return key;
  }
  return null;
}

/** 행 객체의 키를 표준키로 정규화 */
export function normalizeRow(raw: Record<string, any>): Record<StandardKey, string> {
  const out = {} as Record<StandardKey, string>;
  for (const [k, v] of Object.entries(raw)) {
    const std = normalizeHeader(k);
    if (std) out[std] = v == null ? "" : String(v);
  }
  return out;
}

/** 템플릿용 헤더 순서 */
export const TEMPLATE_ORDER: StandardKey[] = [
  "sku", "name", "brand", "categorySlug",
  "price", "salePrice", "stock", "lowStockThreshold",
  "thumbnail", "images", "description",
  "isActive", "isFeatured",
];
