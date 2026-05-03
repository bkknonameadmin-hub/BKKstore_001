/**
 * BullMQ Standalone Worker
 *
 * 운영 실행:
 *   npm run worker
 *
 * Vercel 등 서버리스에서는 별도 워커 호스팅 필요:
 *   - Railway / Render: 단일 프로세스로 실행
 *   - PM2: pm2 start npm --name "worker" -- run worker
 *   - Docker: 별도 컨테이너 (next + worker 분리)
 */

import { config } from "dotenv";
config(); // .env 로드

import { startWorkers } from "../src/lib/workers";
import { shutdownWorkers } from "../src/lib/queue";
import { disconnectRedis } from "../src/lib/redis";

console.log("[worker] starting...");
startWorkers();
console.log("[worker] ready - waiting for jobs");

async function shutdown(signal: string) {
  console.log(`\n[worker] ${signal} received, shutting down...`);
  await shutdownWorkers();
  await disconnectRedis();
  console.log("[worker] bye");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// 영구 실행
setInterval(() => {}, 1 << 30);
