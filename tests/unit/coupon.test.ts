import { describe, it, expect } from "vitest";
import { calcCouponDiscount } from "@/lib/coupon";
import type { Coupon } from "@prisma/client";

function makeCoupon(overrides: Partial<Coupon>): Coupon {
  return {
    id: "c1",
    code: "TEST",
    name: "Test",
    discountType: "FIXED",
    discountValue: 1000,
    minOrderAmount: 0,
    maxDiscount: null,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 86400000),
    totalQuantity: null,
    issuedCount: 0,
    usedCount: 0,
    isActive: true,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Coupon;
}

describe("calcCouponDiscount", () => {
  it("정액 쿠폰: 할인액 그대로 적용", () => {
    const c = makeCoupon({ discountType: "FIXED", discountValue: 5000 });
    expect(calcCouponDiscount(c, 30000)).toBe(5000);
  });

  it("정률 쿠폰: 비율 적용", () => {
    const c = makeCoupon({ discountType: "PERCENT", discountValue: 10 });
    expect(calcCouponDiscount(c, 30000)).toBe(3000);
  });

  it("정률 쿠폰: maxDiscount 상한 적용", () => {
    const c = makeCoupon({ discountType: "PERCENT", discountValue: 50, maxDiscount: 10000 });
    expect(calcCouponDiscount(c, 100000)).toBe(10000);
  });

  it("최소 주문금액 미달시 0", () => {
    const c = makeCoupon({ discountType: "FIXED", discountValue: 5000, minOrderAmount: 50000 });
    expect(calcCouponDiscount(c, 30000)).toBe(0);
  });

  it("할인액이 주문금액보다 클 수 없음", () => {
    const c = makeCoupon({ discountType: "FIXED", discountValue: 50000 });
    expect(calcCouponDiscount(c, 30000)).toBe(30000);
  });
});
