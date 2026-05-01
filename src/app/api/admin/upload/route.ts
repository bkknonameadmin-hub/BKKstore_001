import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { assertAdminApi } from "@/lib/admin-guard";
import { getStorage } from "@/lib/storage";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const guard = await assertAdminApi();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "지원하지 않는 이미지 형식입니다." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "파일 용량은 5MB 이하여야 합니다." }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

    const result = await getStorage().upload({
      buffer: buf,
      filename,
      contentType: file.type,
      prefix: "products",
    });

    return NextResponse.json({ url: result.url, key: result.key });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "업로드 실패" }, { status: 500 });
  }
}
