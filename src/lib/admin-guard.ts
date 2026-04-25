import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

/**
 * 서버 컴포넌트에서 사용. 관리자가 아니면 /login 또는 / 으로 리다이렉트.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login?callbackUrl=/admin");
  if (!isAdminEmail(session.user.email)) redirect("/?error=forbidden");
  return session;
}

/**
 * Route Handler 에서 사용. 관리자 아니면 401/403 응답.
 */
export async function assertAdminApi() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { ok: false as const, status: 401, error: "로그인이 필요합니다." };
  }
  if (!isAdminEmail(session.user.email)) {
    return { ok: false as const, status: 403, error: "관리자만 접근할 수 있습니다." };
  }
  return { ok: true as const, session };
}
