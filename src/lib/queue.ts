import { logger } from "@/lib/logger";

/**
 * 백그라운드 작업 큐 (간단 버전)
 * - 기본: 인메모리 (개발/단일 인스턴스)
 * - 운영: BullMQ + Redis 권장 (현재 인터페이스 그대로 유지하면서 교체)
 *
 * 주요 사용처:
 *  - 알림톡/SMS/이메일 발송 실패시 재시도
 *  - 비동기 후처리 (재고 알림, 매출 리포트 등)
 */

export type Job<T = any> = {
  name: string;
  data: T;
  attempts?: number;
  maxAttempts?: number;
  backoffMs?: number;
};

type Handler = (data: any) => Promise<void>;

const handlers = new Map<string, Handler>();
const queue: Job[] = [];
let running = false;

export function registerHandler(name: string, handler: Handler) {
  handlers.set(name, handler);
}

export function enqueue<T>(job: Job<T>): void {
  queue.push({ maxAttempts: 3, backoffMs: 5000, attempts: 0, ...job });
  if (!running) void runLoop();
}

async function runLoop() {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift()!;
      const handler = handlers.get(job.name);
      if (!handler) {
        logger.warn("queue.no_handler", { jobName: job.name });
        continue;
      }
      try {
        await handler(job.data);
        logger.debug("queue.completed", { jobName: job.name });
      } catch (e: any) {
        const attempts = (job.attempts || 0) + 1;
        const max = job.maxAttempts || 3;
        if (attempts < max) {
          // backoff 후 재시도
          const delay = (job.backoffMs || 5000) * Math.pow(2, attempts - 1);
          logger.warn("queue.retry", { jobName: job.name, attempts, delay, error: e.message });
          setTimeout(() => {
            queue.push({ ...job, attempts });
            if (!running) void runLoop();
          }, delay);
        } else {
          logger.error("queue.failed", { jobName: job.name, attempts, error: e.message });
        }
      }
    }
  } finally {
    running = false;
  }
}

export function queueStats() {
  return { pending: queue.length, handlers: Array.from(handlers.keys()) };
}
