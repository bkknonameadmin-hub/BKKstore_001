/**
 * BullMQ 워커 등록
 * - scripts/worker.ts (standalone) 와 instrumentation.ts (dev) 양쪽에서 호출
 * - 한 번만 등록되도록 가드
 */
import { registerWorker, JOBS } from "@/lib/queue";
import { sendAlimtalk } from "@/lib/alimtalk";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/notify";
import { logger } from "@/lib/logger";

let _registered = false;

export function startWorkers() {
  if (_registered) return;
  _registered = true;

  // 알림톡 발송
  registerWorker(JOBS.ALIMTALK_SEND, async (job) => {
    const result = await sendAlimtalk(job.data);
    if (!result.ok) throw new Error(result.error || "alimtalk failed");
    logger.info("alimtalk.sent", { provider: result.provider, messageId: result.messageId });
  });

  // SMS 발송
  registerWorker(JOBS.SMS_SEND, async (job) => {
    const result = await sendSms(job.data);
    if (!result.ok) throw new Error(result.error || "sms failed");
    logger.info("sms.sent", { provider: result.provider, messageId: result.messageId });
  });

  // 이메일 발송
  registerWorker(JOBS.EMAIL_SEND, async (job) => {
    const result = await sendEmail(job.data);
    if (!result.ok) throw new Error(result.error || "email failed");
    logger.info("email.sent");
  });

  logger.info("workers.started");
}
