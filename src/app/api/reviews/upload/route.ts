import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit, getClientInfo } from "@/lib/security";
import { getStorage } from "@/lib/storage";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const { ip } = getClientInfo(req);
  const rl = rateLimit(`review-upload:${userId}:${ip || ""}`, 30, 5 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 429 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "지원하지 않는 이미지 형식입니다." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "파일 용량은 8MB 이하여야 합니다." }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

    const result = await getStorage().upload({
      buffer: buf,
      filename,
      contentType: file.type,
      prefix: "reviews",
    });

    return NextResponse.json({ url: result.url, key: result.key });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "업로드 실패" }, { status: 500 });
  }
}
