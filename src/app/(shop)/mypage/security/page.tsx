import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ChangePasswordForm from "./ChangePasswordForm";
import PhoneVerifySection from "./PhoneVerifySection";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/mypage/security");
  const userId = (session.user as any).id as string;

  const [user, logs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true, phoneVerifiedAt: true, passwordChangedAt: true, createdAt: true },
    }),
    prisma.loginLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <nav className="text-xs text-gray-500">
        <Link href="/mypage" className="hover:text-brand-600">마이페이지</Link>
        <span className="mx-1">›</span>
        <span className="text-gray-700">보안 설정</span>
      </nav>

      <div>
        <h1 className="text-xl font-bold">보안 설정</h1>
        <p className="text-xs text-gray-500 mt-1">비밀번호와 로그인 이력을 관리합니다.</p>
      </div>

      {/* 계정 정보 */}
      <section className="border border-gray-200 rounded p-5 bg-white">
        <h2 className="font-bold text-sm pb-3 mb-3 border-b border-gray-100">계정 정보</h2>
        <dl className="text-sm space-y-1.5">
          <div className="flex justify-between"><dt className="text-gray-500">이메일</dt><dd className="font-mono">{user.email}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">가입일</dt><dd>{user.createdAt.toLocaleDateString("ko-KR")}</dd></div>
          <div className="flex justify-between">
            <dt className="text-gray-500">비밀번호 최근 변경</dt>
            <dd>{user.passwordChangedAt ? user.passwordChangedAt.toLocaleString("ko-KR") : "변경 이력 없음"}</dd>
          </div>
        </dl>
      </section>

      {/* 휴대폰 인증 */}
      <section className="border border-gray-200 rounded p-5 bg-white">
        <h2 className="font-bold text-sm pb-3 mb-3 border-b border-gray-100 flex items-center justify-between">
          <span>휴대폰 인증</span>
          {user.phoneVerifiedAt && (
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold">인증 완료</span>
          )}
        </h2>
        <PhoneVerifySection
          currentPhone={user.phone}
          verified={!!user.phoneVerifiedAt}
          verifiedAt={user.phoneVerifiedAt?.toISOString() || null}
        />
      </section>

      {/* 비밀번호 변경 */}
      <section className="border border-gray-200 rounded p-5 bg-white">
        <h2 className="font-bold text-sm pb-3 mb-3 border-b border-gray-100">비밀번호 변경</h2>
        <ChangePasswordForm />
      </section>

      {/* 로그인 이력 */}
      <section className="border border-gray-200 rounded p-5 bg-white">
        <h2 className="font-bold text-sm pb-3 mb-3 border-b border-gray-100 flex items-center justify-between">
          <span>최근 로그인 시도 (30건)</span>
          <span className="text-[11px] text-gray-400 font-normal">의심스러운 활동이 보이면 즉시 비밀번호를 변경하세요</span>
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500">로그인 이력이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead className="text-gray-500">
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2">일시</th>
                  <th className="text-center py-2 w-20">결과</th>
                  <th className="text-left py-2 w-32">IP</th>
                  <th className="text-left py-2">디바이스/브라우저</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{l.createdAt.toLocaleString("ko-KR")}</td>
                    <td className="py-2 text-center">
                      {l.success ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">성공</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600">실패</span>
                      )}
                    </td>
                    <td className="py-2 font-mono text-gray-600">{l.ip || "-"}</td>
                    <td className="py-2 text-gray-500 truncate max-w-md">{l.userAgent || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
