"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const NAV: Array<{ href: string; label: string; group: string }> = [
  { href: "/", label: "Dashboard", group: "Portfolio" },
  { href: "/properties", label: "Properties", group: "Portfolio" },
  { href: "/properties/new", label: "New Evaluation", group: "Portfolio" },
  { href: "/assessment", label: "Site Assessment", group: "Underwriting" },
  { href: "/equipment", label: "Equipment", group: "Underwriting" },
  { href: "/economics", label: "Economics", group: "Underwriting" },
  { href: "/clusters", label: "Clusters", group: "Underwriting" },
  { href: "/assumptions", label: "Assumptions", group: "Admin" },
  { href: "/reports", label: "Reports", group: "Admin" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen lg:flex">
      <aside
        className={`no-print z-20 w-full shrink-0 border-b border-ink-800 bg-ink-900 lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:border-b-0 lg:border-r ${
          open ? "" : ""
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3.5 lg:block">
          <Link href="/" className="block">
            <div className="text-[15px] font-bold tracking-tight text-white">TurfOps</div>
            <div className="text-[10.5px] leading-tight text-ink-400">
              Robotic Mowing Underwriting
            </div>
          </Link>
          <button
            type="button"
            className="rounded border border-ink-700 px-2 py-1 text-[12px] text-ink-200 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            Menu
          </button>
        </div>
        <nav className={`${open ? "block" : "hidden"} pb-3 lg:block`}>
          {groups.map((group) => (
            <div key={group} className="mt-2 px-2">
              <div className="label-caps px-2 py-1 text-ink-500">{group}</div>
              {NAV.filter((n) => n.group === group).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded px-2 py-1.5 text-[13px] transition ${
                    isActive(item.href)
                      ? "bg-accent-600 font-semibold text-white"
                      : "text-ink-200 hover:bg-ink-800"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="mt-4 px-4 text-[10.5px] leading-relaxed text-ink-500">
            MVP build. All equipment specifications and operating assumptions are unverified placeholders.
          </div>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 bg-ink-100">
        <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[19px] font-bold leading-tight tracking-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[12.5px] leading-snug text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
