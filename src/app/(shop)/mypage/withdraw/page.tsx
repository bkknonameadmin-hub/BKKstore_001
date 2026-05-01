import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WithdrawForm from "./WithdrawForm";

export const dynamic = "force-dynamic";

export default async function WithdrawPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/mypage/withdraw");
  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, passwordHash: true, pointBalance: true },
  });
  if (!user) redirect("/login");

  const inflight = await prisma.order.count({
    where: { userId, status: { in: ["PAID", "PREPARING", "SHIPPED"] } },
  });

  return (
    <div>
      <nav className="text-xs text-gray-500 mb-4">
        <Link href="/mypage/security" className="hover:text-brand-600">보안 설정</Link>
        <span className="mx-1">›</span>
        <span className="text-gray-700">회원 탈퇴</span>
      </nav>

      <h1 className="text-xl font-bold mb-6">회원 탈퇴</h1>

      <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700 leading-relaxed mb-6">
        <p className="font-bold mb-2">⚠️ 탈퇴 전 꼭 확인해주세요</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>탈퇴 즉시 로그아웃되며, 동일 이메일로 즉시 재가입할 수 없습니다.</li>
          <li>위시리스트, 배송지, 적립금({user.pointBalance.toLocaleString()}원), 사용 가능한 쿠폰은 즉시 소멸됩니다.</li>
          <li>주문/결제 이력은 전자상거래법에 따라 5년간 보관됩니다 (개인정보는 분리 보관/익명화).</li>
          <li>이메일, 이름, 휴대폰 번호 등 개인정보는 즉시 분리/마스킹 처리됩니다.</li>
        </ul>
      </div>

      {inflight > 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-800">
          <p className="font-bold">현재 진행 중인 주문 {inflight}건이 있어 탈퇴할 수 없습니다.</p>
          <p className="text-xs mt-1">배송 완료 후 다시 시도해주세요.</p>
          <Link href="/mypage" className="inline-block mt-3 btn-outline text-xs h-9">주문 내역 보기</Link>
        </div>
      ) : (
        <WithdrawForm hasPassword={!!user.passwordHash} email={user.email} />
      )}
    </div>
  );
}
