import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertAdminApi } from "@/lib/admin-guard";
import { retryFailedJob } from "@/lib/queue";

const Schema = z.object({ jobIds: z.array(z.string()).min(1).max(500) });

export async function POST(req: NextRequest) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { jobIds } = Schema.parse(await req.json());
    let retried = 0;
    for (const id of jobIds) {
      const ok = await retryFailedJob(id);
      if (ok) retried++;
    }
    return NextResponse.json({ ok: true, retried, requested: jobIds.length });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
