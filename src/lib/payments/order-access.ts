import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Order } from "@prisma/client";

/**
 * 결제 라우트에서 사용. 주문 소유권 + 진행 가능 상태 검증.
 * - 회원 주문: 로그인 + userId 일치
 * - 비회원 주문: 비로그인 (로그인 사용자가 임의 비회원 주문에 진입 차단)
 *
 * 반환:
 *   { ok: true } 또는 { ok: false, status, error }
 */
export async function assertOrderOwnership(order: Order): Promise<
  | { ok: true }
  | { ok: false; status: number; error: string }
> {
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as any)?.id as string | undefined;

  if (order.userId) {
    if (!sessionUserId) {
      return { ok: false, status: 401, error: "로그인이 필요합니다." };
    }
    if (sessionUserId !== order.userId) {
      return { ok: false, status: 403, error: "권한이 없습니다." };
    }
  } else {
    // 비회원 주문은 비로그인 컨텍스트에서만 접근 허용
    if (sessionUserId) {
      return { ok: false, status: 403, error: "권한이 없습니다." };
    }
  }
  return { ok: true };
}
