"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { propertyHref, type PropertyTab } from "@/lib/routes";

const TABS: Array<{ slug: PropertyTab; label: string }> = [
  { slug: "", label: "Overview" },
  { slug: "intake", label: "Intake" },
  { slug: "assessment", label: "Site Assessment" },
  { slug: "cluster", label: "Cluster" },
  { slug: "equipment", label: "Equipment" },
  { slug: "intervention", label: "Intervention" },
  { slug: "residual", label: "Residual Scope" },
  { slug: "value", label: "Customer Value" },
  { slug: "contract", label: "Contract" },
  { slug: "economics", label: "Economics" },
  { slug: "report", label: "Report" },
];

export function PropertyNav({ id }: { id: string }) {
  const pathname = usePathname();
  // Trailing slashes are enabled for static hosting, so normalize before comparing.
  const current = pathname.replace(/\/+$/, "") || "/";

  return (
    <nav className="no-print mb-4 flex gap-1 overflow-x-auto border-b border-ink-200 pb-px">
      {TABS.map((t) => {
        const active = current === (t.slug ? `/property/${t.slug}` : "/property");
        return (
          <Link
            key={t.slug}
            href={propertyHref(id, t.slug)}
            className={`whitespace-nowrap rounded-t border-b-2 px-3 py-2 text-[12.5px] transition ${
              active
                ? "border-accent-600 font-semibold text-accent-700"
                : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
