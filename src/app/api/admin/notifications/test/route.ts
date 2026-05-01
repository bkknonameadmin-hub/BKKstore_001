import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertAdminApi } from "@/lib/admin-guard";
import { sendAlimtalk, type TemplateKey } from "@/lib/alimtalk";

const Schema = z.object({
  phone: z.string().min(10).max(20),
  template: z.enum(["ORDER_PAID", "SHIPPING_STARTED", "DELIVERY_COMPLETED", "ORDER_CANCELLED", "ORDER_REFUNDED"]),
});

export async function POST(req: NextRequest) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { phone, template } = Schema.parse(await req.json());

    // 미리보기용 샘플 변수 (관리자 페이지의 미리보기와 동일 값)
    const sample: Record<string, string> = {
      name: "테스트", orderNo: "ORD-20260501-XYZ12",
      amount: "85,000", method: "신용카드",
      courier: "CJ대한통운", trackingNo: "1234567890",
    };
    const buttonUrls: Record<string, string> = {
      trackingUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/orders/${sample.orderNo}/tracking`,
      reviewUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/mypage/reviews`,
    };

    const result = await sendAlimtalk({
      to: phone,
      template: template as TemplateKey,
      variables: sample,
      buttonUrls,
    });

    return NextResponse.json({ result });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "발송 실패" }, { status: 400 });
  }
}
