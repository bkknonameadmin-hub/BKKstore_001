/** Notice category 메타 */
export const NOTICE_CATEGORIES = [
  { value: "IMPORTANT", label: "중요", tone: "danger" as const },
  { value: "EVENT",     label: "이벤트", tone: "warning" as const },
  { value: "GENERAL",   label: "일반", tone: "default" as const },
];

export function noticeCategoryMeta(value: string) {
  return NOTICE_CATEGORIES.find((c) => c.value === value) || NOTICE_CATEGORIES[2];
}

/** FAQ category 메타 */
export const FAQ_CATEGORIES = [
  { value: "SHOPPING", label: "쇼핑/상품" },
  { value: "DELIVERY", label: "배송" },
  { value: "RETURN",   label: "교환/반품" },
  { value: "PAYMENT",  label: "결제" },
  { value: "ACCOUNT",  label: "회원/계정" },
  { value: "ETC",      label: "기타" },
];

export function faqCategoryMeta(value: string) {
  return FAQ_CATEGORIES.find((c) => c.value === value) || FAQ_CATEGORIES[5];
}
