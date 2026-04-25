import nodemailer from "nodemailer";

export function getLowStockThreshold(): number {
  const v = parseInt(process.env.LOW_STOCK_THRESHOLD || "10", 10);
  return Number.isFinite(v) && v >= 0 ? v : 10;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;

  transporter = nodemailer.createTransport({
    host, port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(args: SendEmailArgs): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) return { ok: false, error: "SMTP 환경변수가 설정되지 않았습니다." };

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message || "메일 발송 실패" };
  }
}

export async function sendSlack(text: string, blocks?: any[]): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return { ok: false, error: "SLACK_WEBHOOK_URL 미설정" };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, blocks }),
    });
    if (!res.ok) return { ok: false, error: `Slack ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message || "Slack 발송 실패" };
  }
}

/**
 * 통합 발송: 이메일 + Slack (둘 다 시도, 결과 합쳐서 반환)
 */
export async function notifyAdmin(args: { subject: string; html: string; text: string }): Promise<{
  email: { ok: boolean; error?: string };
  slack: { ok: boolean; error?: string };
}> {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  const email = adminEmail
    ? await sendEmail({ to: adminEmail, subject: args.subject, html: args.html, text: args.text })
    : { ok: false, error: "ADMIN_NOTIFY_EMAIL 미설정" };
  const slack = await sendSlack(`*${args.subject}*\n${args.text}`);
  return { email, slack };
}
