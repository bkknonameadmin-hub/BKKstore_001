import Link from "next/link";

const NAV = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/shipping", label: "배송 안내" },
  { href: "/refund", label: "교환·반품·환불" },
  { href: "/youth-protection", label: "청소년보호정책" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-mall py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
        <aside className="lg:sticky lg:top-32 self-start">
          <h2 className="text-sm font-bold mb-3 text-gray-700">고객 안내</h2>
          <nav className="border border-gray-200 rounded bg-white">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="block px-4 py-2.5 text-sm hover:bg-gray-50 border-b last:border-b-0 border-gray-100"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </aside>
        <article className="prose prose-sm max-w-none">{children}</article>
      </div>
    </div>
  );
}
