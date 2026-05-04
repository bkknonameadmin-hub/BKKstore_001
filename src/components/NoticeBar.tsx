import Link from "next/link";
import { getSiteSettings } from "@/lib/site-settings";

export default async function NoticeBar() {
  const { noticeBar } = await getSiteSettings();
  if (!noticeBar.enabled || !noticeBar.text) return null;

  const bg = noticeBar.bgColor || "bg-brand-700";
  const fg = noticeBar.fgColor || "text-white";
  const cls = `${bg} ${fg} px-4 py-2 text-xs text-center`;

  if (noticeBar.href) {
    return (
      <Link href={noticeBar.href} className={`block ${cls} hover:opacity-90`}>
        <span className="inline-block">📢 {noticeBar.text}</span>
      </Link>
    );
  }
  return <div className={cls}>📢 {noticeBar.text}</div>;
}
