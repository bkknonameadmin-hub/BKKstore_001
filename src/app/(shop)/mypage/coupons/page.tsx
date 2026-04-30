import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/utils";
import CouponRedeemForm from "./CouponRedeemForm";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/mypage/coupons");
  const userId = (session.user as any).id as string;

  const coupons = await prisma.userCoupon.findMany({
    where: { userId },
    orderBy: [{ usedAt: "asc" }, { createdAt: "desc" }],
    include: { coupon: true },
  });

  const now = new Date();
  const usable = coupons.filter((c) => !c.usedAt && c.expiresAt > now);
  const used = coupons.filter((c) => c.usedAt);
  const expired = coupons.filter((c) => !c.usedAt && c.expiresAt <= now);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">쿠폰함 ({usable.length}장 사용가능)</h1>

      <CouponRedeemForm />

      <h2 className="font-bold pb-2 border-b border-gray-200 mt-8 mb-3 text-sm">사용 가능한 쿠폰 ({usable.length})</h2>
      {usable.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">사용 가능한 쿠폰이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {usable.map((c) => <CouponCard key={c.id} uc={c} />)}
        </div>
      )}

      {used.length > 0 && (
        <>
          <h2 className="font-bold pb-2 border-b border-gray-200 mt-8 mb-3 text-sm">사용한 쿠폰 ({used.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-60">
            {used.slice(0, 10).map((c) => <CouponCard key={c.id} uc={c} status="used" />)}
          </div>
        </>
      )}

      {expired.length > 0 && (
        <>
          <h2 className="font-bold pb-2 border-b border-gray-200 mt-8 mb-3 text-sm">만료된 쿠폰 ({expired.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-60">
            {expired.slice(0, 10).map((c) => <CouponCard key={c.id} uc={c} status="expired" />)}
          </div>
        </>
      )}
    </div>
  );
}

function CouponCard({ uc, status }: { uc: any; status?: "used" | "expired" }) {
  const c = uc.coupon;
  const valueText = c.discountType === "PERCENT" ? `${c.discountValue}%` : `${formatKRW(c.discountValue)}`;
  return (
    <div className="border border-gray-200 rounded p-4 bg-white relative">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-brand-600">{valueText}</span>
        <span className="text-sm text-gray-700">{c.name}</span>
      </div>
      {c.description && <p className="text-xs text-gray-500 mt-1">{c.description}</p>}
      <dl className="mt-3 text-xs text-gray-500 space-y-0.5">
        <div className="flex justify-between"><dt>최소주문</dt><dd>{c.minOrderAmount > 0 ? formatKRW(c.minOrderAmount) : "조건없음"}</dd></div>
        {c.maxDiscount && <div className="flex justify-between"><dt>최대할인</dt><dd>{formatKRW(c.maxDiscount)}</dd></div>}
        <div className="flex justify-between">
          <dt>사용기한</dt>
          <dd>~ {new Date(uc.expiresAt).toLocaleDateString("ko-KR")}</dd>
        </div>
      </dl>
      {status === "used" && <div className="absolute top-3 right-3 px-2 py-0.5 text-[10px] rounded bg-gray-200 text-gray-600">사용 완료</div>}
      {status === "expired" && <div className="absolute top-3 right-3 px-2 py-0.5 text-[10px] rounded bg-red-100 text-red-600">기간 만료</div>}
    </div>
  );
}
