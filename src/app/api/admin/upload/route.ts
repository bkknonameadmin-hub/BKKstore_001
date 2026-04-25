import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { assertAdminApi } from "@/lib/admin-guard";

// 개발용: 로컬 파일시스템(/public/uploads) 에 저장
// 운영 환경에서는 S3 / Cloudinary / Cloudflare R2 등 오브젝트 스토리지 사용 권장
// (Vercel 등 서버리스 환경에서는 /public 에 쓰기 불가)

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
    const fname = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fname), buf);

    return NextResponse.json({ url: `/uploads/${fname}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "업로드 실패" }, { status: 500 });
  }
}
