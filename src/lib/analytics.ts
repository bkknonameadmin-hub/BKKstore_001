/**
 * GA4 이벤트 헬퍼
 * - 향상된 전자상거래(Enhanced Ecommerce) 이벤트 표준 준수
 * - GA_ID 미설정시 모든 호출이 no-op
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

function safeGtag(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

type GAItem = {
  item_id: string;
  item_name: string;
  item_brand?: string | null;
  item_category?: string | null;
  item_variant?: string | null;
  price: number;
  quantity?: number;
  discount?: number;
  index?: number;
};

type CommonProps = {
  currency?: string;
  value: number;
  items: GAItem[];
};

/** 페이지뷰 (수동 호출 — 일반적으로 Next.js auto-pageview 권장) */
export function trackPageView(url: string, title?: string) {
  if (!safeGtag()) return;
  window.gtag!("event", "page_view", { page_path: url, page_title: title });
}

/** 상품 상세 조회 */
export function trackViewItem(props: CommonProps) {
  if (!safeGtag()) return;
  window.gtag!("event", "view_item", {
    currency: props.currency || "KRW",
    value: props.value,
    items: props.items,
  });
}

/** 상품 목록 조회 */
export function trackViewItemList(listId: string, listName: string, items: GAItem[]) {
  if (!safeGtag()) return;
  window.gtag!("event", "view_item_list", {
    item_list_id: listId,
    item_list_name: listName,
    items,
  });
}

/** 카트 담기 */
export function trackAddToCart(props: CommonProps) {
  if (!safeGtag()) return;
  window.gtag!("event", "add_to_cart", {
    currency: props.currency || "KRW",
    value: props.value,
    items: props.items,
  });
}

/** 카트 제거 */
export function trackRemoveFromCart(props: CommonProps) {
  if (!safeGtag()) return;
  window.gtag!("event", "remove_from_cart", {
    currency: props.currency || "KRW",
    value: props.value,
    items: props.items,
  });
}

/** 결제 시작 */
export function trackBeginCheckout(props: CommonProps & { coupon?: string }) {
  if (!safeGtag()) return;
  window.gtag!("event", "begin_checkout", {
    currency: props.currency || "KRW",
    value: props.value,
    items: props.items,
    coupon: props.coupon,
  });
}

/** 구매 완료 */
export function trackPurchase(props: CommonProps & {
  transaction_id: string;
  shipping?: number;
  tax?: number;
  coupon?: string;
}) {
  if (!safeGtag()) return;
  window.gtag!("event", "purchase", {
    transaction_id: props.transaction_id,
    currency: props.currency || "KRW",
    value: props.value,
    shipping: props.shipping || 0,
    tax: props.tax || 0,
    coupon: props.coupon,
    items: props.items,
  });
}

/** 검색 */
export function trackSearch(searchTerm: string) {
  if (!safeGtag()) return;
  window.gtag!("event", "search", { search_term: searchTerm });
}

/** 위시리스트 추가 */
export function trackAddToWishlist(props: CommonProps) {
  if (!safeGtag()) return;
  window.gtag!("event", "add_to_wishlist", {
    currency: props.currency || "KRW",
    value: props.value,
    items: props.items,
  });
}

/** 회원 가입 */
export function trackSignUp(method = "credentials") {
  if (!safeGtag()) return;
  window.gtag!("event", "sign_up", { method });
}

/** 로그인 */
export function trackLogin(method = "credentials") {
  if (!safeGtag()) return;
  window.gtag!("event", "login", { method });
}
