import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkPasswordStrength, getClientInfo, rateLimit } from "@/lib/security";

const Schema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(12).max(128),
  name: z.string().min(1).max(60),
  phone: z.string().max(20).optional(),
});

const SIGNUP_BONUS_POINT = 1000;

export async function POST(req: NextRequest) {
  try {
    const { ip } = getClientInfo(req);
    const rl = rateLimit(`register:${ip || "anon"}`, 5, 10 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
    }

    const data = Schema.parse(await req.json());

    const pwCheck = checkPasswordStrength(data.password);
    if (!pwCheck.ok) {
      return NextResponse.json({ error: pwCheck.reason }, { status: 400 });
    }

    const email = data.email.toLowerCase().trim();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          name: data.name.trim(),
          phone: data.phone?.trim() || null,
          passwordHash,
          pointBalance: SIGNUP_BONUS_POINT,
          passwordChangedAt: new Date(),
        },
        select: { id: true, email: true, name: true },
      });

      // 가입 축하 적립금 이력
      if (SIGNUP_BONUS_POINT > 0) {
        await tx.pointHistory.create({
          data: {
            userId: u.id,
            amount: SIGNUP_BONUS_POINT,
            reason: "회원가입 축하",
          },
        });
      }

      return u;
    });

    return NextResponse.json(user);
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: e.issues[0]?.message || "유효성 오류" }, { status: 400 });
    return NextResponse.json({ error: e.message || "회원가입 실패" }, { status: 400 });
  }
}
