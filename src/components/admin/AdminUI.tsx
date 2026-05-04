import Link from "next/link";
import type { ReactNode } from "react";

/** 페이지 헤더 (제목 + 부제 + 우측 액션) */
export function PageHeader({
  title,
  desc,
  actions,
  breadcrumbs,
}: {
  title: string;
  desc?: string;
  actions?: ReactNode;
  breadcrumbs?: { href?: string; label: string }[];
}) {
  return (
    <header className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {b.href ? (
                <Link href={b.href} className="hover:text-brand-600">{b.label}</Link>
              ) : (
                <span className="text-gray-700">{b.label}</span>
              )}
              {i < breadcrumbs.length - 1 && <span className="text-gray-300">›</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>
          {desc && <p className="text-sm text-gray-500 mt-1">{desc}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** 컨텐츠 카드 박스 */
export function AdminCard({
  title,
  desc,
  children,
  actions,
  className = "",
  noPadding,
}: {
  title?: string;
  desc?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <section className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            {title && <h2 className="font-bold text-gray-900">{title}</h2>}
            {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={noPadding ? "" : "p-4"}>{children}</div>
    </section>
  );
}

/** KPI 통계 카드 */
export function StatCard({
  label,
  value,
  sub,
  icon,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  href?: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const tones: Record<string, { bg: string; iconBg: string; iconText: string }> = {
    default: { bg: "border-gray-200", iconBg: "bg-gray-100", iconText: "text-gray-600" },
    success: { bg: "border-emerald-200", iconBg: "bg-emerald-100", iconText: "text-emerald-700" },
    warning: { bg: "border-amber-200", iconBg: "bg-amber-100", iconText: "text-amber-700" },
    danger:  { bg: "border-rose-200", iconBg: "bg-rose-100", iconText: "text-rose-700" },
    info:    { bg: "border-brand-200", iconBg: "bg-brand-50", iconText: "text-brand-700" },
  };
  const t = tones[tone];

  const inner = (
    <>
      {icon && (
        <div className={`w-10 h-10 rounded-lg ${t.iconBg} ${t.iconText} flex items-center justify-center text-xl shrink-0`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`mt-1 text-2xl font-bold ${tone === "danger" ? "text-rose-600" : "text-gray-900"} truncate`}>{value}</div>
        {sub && <div className="mt-0.5 text-[11px] text-gray-400 truncate">{sub}</div>}
      </div>
    </>
  );

  const cls = `bg-white rounded-lg border ${t.bg} p-4 flex items-center gap-3 transition-all`;
  if (href) {
    return <Link href={href} className={`${cls} hover:border-brand-500 hover:shadow-sm`}>{inner}</Link>;
  }
  return <div className={cls}>{inner}</div>;
}

/** 빈 상태 */
export function EmptyState({
  icon = "📭",
  title,
  desc,
  action,
}: {
  icon?: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-12 text-center">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-sm text-gray-700 font-medium">{title}</p>
      {desc && <p className="text-xs text-gray-400 mt-1">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** 상태 뱃지 */
export function StatusBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "info" | "purple" | "gray";
}) {
  const tones: Record<string, string> = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger:  "bg-rose-100 text-rose-700",
    info:    "bg-brand-50 text-brand-700",
    purple:  "bg-purple-100 text-purple-700",
    gray:    "bg-gray-200 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${tones[tone]}`}>
      {label}
    </span>
  );
}

/** 데이터 테이블 (간단) */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
}: {
  columns: { key: string; label: string; align?: "left" | "right" | "center"; cell: (row: T) => ReactNode; className?: string }[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    return <div className="p-4">{empty || <EmptyState title="데이터가 없습니다." />}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 text-xs">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-2.5 font-medium ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"} ${c.className || ""}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className="border-t border-gray-100 hover:bg-gray-50/50">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-4 py-2.5 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"} ${c.className || ""}`}
                >
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
