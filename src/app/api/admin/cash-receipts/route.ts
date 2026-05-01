import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertAdminApi } from "@/lib/admin-guard";
import { issueCashReceipt } from "@/lib/cash-receipt";

const Schema = z.object({
  orderId: z.string(),
  type: z.enum(["PERSONAL", "BUSINESS"]),
  registrationNumber: z.string().min(8).max(20),
});

export async function POST(req: NextRequest) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const data = Schema.parse(await req.json());
    const result = await issueCashReceipt(data);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "발행 실패" }, { status: 400 });
  }
}
