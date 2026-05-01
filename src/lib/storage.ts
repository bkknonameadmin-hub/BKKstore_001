/**
 * 파일 스토리지 추상화
 * - 기본: 로컬 파일시스템 (/public/uploads) — 개발용
 * - STORAGE_PROVIDER=s3 일때: S3/R2/MinIO 호환 (운영용)
 *
 * Vercel 등 서버리스 환경은 로컬 디스크 쓰기 불가 → 운영시 반드시 s3 사용
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export type UploadInput = {
  buffer: Buffer;
  filename: string;
  contentType: string;
  /** 하위 디렉토리/프리픽스 (예: "reviews", "products") */
  prefix?: string;
};

export type UploadResult = {
  url: string;            // 클라이언트가 접근할 수 있는 공개 URL
  key: string;            // 스토리지 내부 식별자 (삭제용)
  provider: string;
};

export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadResult>;
  delete?(key: string): Promise<void>;
}

/* ========== 로컬 FS ========== */

class LocalStorage implements StorageProvider {
  async upload({ buffer, filename, prefix }: UploadInput): Promise<UploadResult> {
    const sub = (prefix || "").replace(/[^a-z0-9-_/]/gi, "");
    const dir = path.join(process.cwd(), "public", "uploads", sub);
    await mkdir(dir, { recursive: true });
    const safeName = filename.replace(/[^a-z0-9-_.]/gi, "_");
    await writeFile(path.join(dir, safeName), buffer);
    const url = `/uploads${sub ? "/" + sub : ""}/${safeName}`;
    return { url, key: url, provider: "local" };
  }
}

/* ========== S3 호환 (선택) ========== */
/*
운영 도입 시:
1) npm install @aws-sdk/client-s3
2) .env 에 STORAGE_PROVIDER=s3 + S3_* 설정
3) 아래 주석 해제

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

class S3Storage implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor() {
    this.client = new S3Client({
      region: process.env.S3_REGION!,
      endpoint: process.env.S3_ENDPOINT,            // R2/MinIO 호환
      forcePathStyle: !!process.env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
    });
    this.bucket = process.env.S3_BUCKET!;
    this.publicBaseUrl = process.env.S3_PUBLIC_URL!.replace(/\/$/, "");
  }

  async upload({ buffer, filename, contentType, prefix }: UploadInput): Promise<UploadResult> {
    const key = [prefix, filename].filter(Boolean).join("/");
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    return { url: `${this.publicBaseUrl}/${key}`, key, provider: "s3" };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
*/

let _storage: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (_storage) return _storage;
  const provider = process.env.STORAGE_PROVIDER?.toLowerCase();
  if (provider === "s3") {
    // 운영 도입 시 위 S3Storage 활성화 후 아래 반환
    // _storage = new S3Storage();
    console.warn("[storage] STORAGE_PROVIDER=s3 인데 S3Storage 가 비활성 상태입니다. 로컬로 폴백합니다.");
  }
  _storage = new LocalStorage();
  return _storage;
}
