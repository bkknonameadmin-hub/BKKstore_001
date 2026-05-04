import { prisma } from "@/lib/prisma";

/**
 * 관리자/직원 액션 감사 로그 헬퍼.
 *
 * 모든 어드민 mutation 라우트에서 다음 형태로 호출:
 *
 *   await audit({
 *     actorId: guard.session?.user?.id,
 *     actorEmail: guard.session?.user?.email,
 *     action: "product.update",
 *     targetType: "Product",
 *     targetId: product.id,
 *     metadata: { fields: ["name", "price"] },
 *   });
 *
 * - 실패해도 본 작업을 롤백시키지 않도록 try/catch 흡수
 * - 메타데이터는 JSON-serializable 한 값만 (Date 는 ISO 문자열로 미리 변환 권장)
 */
export async function audit(args: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, any> | null;
  ip?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: args.actorId || null,
        actorEmail: args.actorEmail || null,
        action: args.action,
        targetType: args.targetType || null,
        targetId: args.targetId || null,
        metadata: args.metadata ? (args.metadata as any) : undefined,
        ip: args.ip || null,
      } as any,
    });
  } catch (e) {
    // 감사 로그 실패는 본 작업을 막지 않음 — 단, 로그로 남김
    console.error("[audit] failed to write", { action: args.action, error: (e as any)?.message });
  }
}
