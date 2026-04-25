import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOrderNo } from "@/lib/utils";

const Schema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1),
  })).min(1),
  recipient: z.string().min(1),
  phone: z.string().min(1),
  zipCode: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().optional(),
  memo: z.string().optional(),
  provider: z.enum(["TOSS", "INICIS", "NAVERPAY"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = Schema.parse(body);

    // 서버 측에서 가격을 다시 계산 (신뢰할 수 있는 금액 확보)
    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, isActive: true } });

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "유효하지 않은 상품이 포함되어 있습니다." }, { status: 400 });
    }

    let subtotal = 0;
    const orderItemsData = data.items.map((it) => {
      const p = products.find((x) => x.id === it.productId)!;
      const unitPrice = p.salePrice ?? p.price;
      if (p.stock < it.quantity) throw new Error(`${p.name} 재고가 부족합니다.`);
      subtotal += unitPrice * it.quantity;
      return { productId: p.id, name: p.name, price: unitPrice, quantity: it.quantity };
    });

    const shippingFee = subtotal >= 50000 ? 0 : 3000;
    const totalAmount = subtotal + shippingFee;

    const order = await prisma.order.create({
      data: {
        orderNo: generateOrderNo(),
        status: "PENDING",
        totalAmount,
        shippingFee,
        recipient: data.recipient,
        phone: data.phone,
        zipCode: data.zipCode,
        address1: data.address1,
        address2: data.address2,
        memo: data.memo,
        provider: data.provider,
        items: { create: orderItemsData },
      },
    });

    return NextResponse.json({
      orderId: order.id,
      orderNo: order.orderNo,
      totalAmount: order.totalAmount,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "주문 생성 실패" }, { status: 400 });
  }
}
