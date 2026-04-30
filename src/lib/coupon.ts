import type { Coupon, UserCoupon } from "@prisma/client";

/** 쿠폰 할인액 계산 (max 적용 + 음수 방지) */
export function calcCouponDiscount(coupon: Coupon, itemsAmount: number): number {
  if (itemsAmount < coupon.minOrderAmount) return 0;
  let discount = 0;
  if (coupon.discountType === "PERCENT") {
    discount = Math.floor((itemsAmount * coupon.discountValue) / 100);
    if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
  } else {
    discount = coupon.discountValue;
  }
  return Math.min(discount, itemsAmount);
}

export function validateCouponForOrder(
  uc: (UserCoupon & { coupon: Coupon }) | null | undefined,
  userId: string,
  itemsAmount: number
): { ok: boolean; error?: string } {
  if (!uc) return { ok: false, error: "쿠폰을 찾을 수 없습니다." };
  if (uc.userId !== userId) return { ok: false, error: "본인의 쿠폰이 아닙니다." };
  if (uc.usedAt) return { ok: false, error: "이미 사용한 쿠폰입니다." };
  if (uc.expiresAt < new Date()) return { ok: false, error: "만료된 쿠폰입니다." };

  const c = uc.coupon;
  if (!c.isActive) return { ok: false, error: "현재 사용할 수 없는 쿠폰입니다." };
  const now = new Date();
  if (c.validFrom > now) return { ok: false, error: "아직 사용할 수 없는 쿠폰입니다." };
  if (c.validUntil < now) return { ok: false, error: "쿠폰 사용 기간이 지났습니다." };
  if (itemsAmount < c.minOrderAmount) {
    return { ok: false, error: `최소 주문금액 ${c.minOrderAmount.toLocaleString()}원 이상에 사용할 수 있습니다.` };
  }
  return { ok: true };
}
