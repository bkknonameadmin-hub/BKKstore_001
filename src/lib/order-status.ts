import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "결제대기",
  PAID: "결제완료",
  PREPARING: "배송준비중",
  SHIPPED: "배송중",
  DELIVERED: "배송완료",
  CANCELLED: "주문취소",
  REFUNDED: "환불완료",
  PARTIALLY_REFUNDED: "부분환불",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  PAID: "bg-blue-50 text-blue-700",
  PREPARING: "bg-amber-50 text-amber-700",
  SHIPPED: "bg-indigo-50 text-indigo-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  REFUNDED: "bg-purple-50 text-purple-700",
  PARTIALLY_REFUNDED: "bg-purple-50 text-purple-600",
};

/** 다음에 갈 수 있는 상태 후보 */
export const NEXT_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:           ["CANCELLED"],
  PAID:              ["PREPARING", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"],
  PREPARING:         ["SHIPPED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"],
  SHIPPED:           ["DELIVERED", "REFUNDED", "PARTIALLY_REFUNDED"],
  DELIVERED:         ["REFUNDED", "PARTIALLY_REFUNDED"],
  PARTIALLY_REFUNDED:["REFUNDED"],
  CANCELLED:         [],
  REFUNDED:          [],
};

export const COURIERS = [
  "CJ대한통운", "한진택배", "롯데택배", "우체국택배", "로젠택배", "쿠팡로지스틱스", "기타",
];
