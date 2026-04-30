import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PointsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/mypage/points");
  const userId = (session.user as any).id as string;

  const [user, history] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { pointBalance: true } }),
    prisma.pointHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">적립금 내역</h1>

      <div className="rounded p-6 bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-200 mb-6">
        <div className="text-xs text-amber-700">현재 사용 가능 적립금</div>
        <div className="text-3xl font-bold text-amber-700 mt-1">{formatKRW(user.pointBalance)}</div>
        <p className="mt-2 text-[11px] text-amber-700/80">
          적립금은 결제 시 1원 단위로 사용할 수 있습니다 · 적립일로부터 1년간 유효
        </p>
      </div>

      <h2 className="font-bold pb-2 border-b border-gray-200 mb-3 text-sm">최근 이력 (100건)</h2>
      {history.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">적립금 이력이 없습니다.</p>
      ) : (
        <div className="border border-gray-200 rounded bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs">
              <tr>
                <th className="text-left px-3 py-2.5">일시</th>
                <th className="text-left px-3 py-2.5">사유</th>
                <th className="text-right px-3 py-2.5 w-28">금액</th>
                <th className="text-right px-3 py-2.5 w-32">만료일</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t border-gray-100">
                  <td className="px-3 py-2.5 text-xs text-gray-600">{h.createdAt.toLocaleString("ko-KR")}</td>
                  <td className="px-3 py-2.5">{h.reason}</td>
                  <td className={`px-3 py-2.5 text-right font-bold ${h.amount > 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {h.amount > 0 ? "+" : ""}{formatKRW(h.amount)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-gray-400">
                    {h.expiresAt ? h.expiresAt.toLocaleDateString("ko-KR") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
