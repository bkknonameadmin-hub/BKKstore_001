import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdminApi } from "@/lib/admin-guard";

const Schema = z.object({ skus: z.array(z.string()).max(5000) });

export async function POST(req: NextRequest) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { skus } = Schema.parse(await req.json());
    if (skus.length === 0) return NextResponse.json({ existing: [] });
    const found = await prisma.product.findMany({
      where: { sku: { in: skus } },
      select: { sku: true },
    });
    return NextResponse.json({ existing: found.map((f) => f.sku) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "조회 실패" }, { status: 400 });
  }
}
