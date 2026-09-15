"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type Tone = "neutral" | "good" | "warn" | "bad" | "accent";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700 border-ink-200",
  good: "bg-good-50 text-good-700 border-good-500/25",
  warn: "bg-warn-50 text-warn-500 border-warn-500/25",
  bad: "bg-bad-50 text-bad-500 border-bad-500/25",
  accent: "bg-accent-50 text-accent-700 border-accent-200",
};

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
  dense = false,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return (
    <section
      className={`print-page rounded-md border border-ink-200 bg-white shadow-[0_1px_2px_rgba(23,27,39,0.04)] ${className}`}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-[13.5px] font-semibold text-ink-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[12px] leading-snug text-ink-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={dense ? "" : "p-4"}>{children}</div>
    </section>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
  href,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  href?: string;
}) {
  const body = (
    <div className="rounded-md border border-ink-200 bg-white px-3.5 py-3">
      <div className="label-caps">{label}</div>
      <div
        className={`tnum mt-1 text-[21px] font-semibold leading-tight ${
          tone === "good"
            ? "text-good-700"
            : tone === "bad"
              ? "text-bad-500"
              : tone === "warn"
                ? "text-warn-500"
                : "text-ink-900"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11.5px] leading-snug text-ink-500">{sub}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}

export function scoreTone(score: number): Tone {
  if (score >= 80) return "good";
  if (score >= 60) return "accent";
  if (score >= 45) return "warn";
  return "bad";
}

const TONE_BAR: Record<Tone, string> = {
  good: "bg-good-500",
  accent: "bg-accent-600",
  warn: "bg-warn-500",
  bad: "bg-bad-500",
  neutral: "bg-ink-400",
};

export function ScoreBar({
  score,
  label,
  right,
  tone,
  height = "h-1.5",
}: {
  score: number;
  label?: ReactNode;
  right?: ReactNode;
  tone?: Tone;
  height?: string;
}) {
  const t = tone ?? scoreTone(score);
  return (
    <div>
      {(label || right) && (
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <span className="text-[12.5px] text-ink-700">{label}</span>
          <span className="tnum text-[12.5px] font-semibold text-ink-900">{right}</span>
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-ink-200 ${height}`}>
        <div
          className={`${height} rounded-full ${TONE_BAR[t]}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

/** Large circular score indicator used on dashboards and report headers. */
export function ScoreDial({
  score,
  caption,
  size = 104,
}: {
  score: number;
  caption?: string;
  size?: number;
}) {
  const tone = scoreTone(score);
  const stroke = size * 0.085;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * c;
  const color =
    tone === "good" ? "#1f7a4d" : tone === "accent" ? "#1f4f88" : tone === "warn" ? "#a86a12" : "#a3312a";
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${Math.round(score)} of 100`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#d8dce4" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className="tnum"
          fontSize={size * 0.3}
          fontWeight={650}
          fill="#171b27"
        >
          {Math.round(score)}
        </text>
      </svg>
      {caption && <div className="mt-1 text-center text-[11.5px] font-medium text-ink-600">{caption}</div>}
    </div>
  );
}

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse text-[12.5px] ${className}`}>{children}</table>
    </div>
  );
}

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function Th({
  children,
  align = "left",
  className = "",
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      className={`label-caps whitespace-nowrap border-b border-ink-200 px-3 py-2 ${ALIGN[align]} ${className}`}
      scope="col"
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
  numeric = false,
  title,
  colSpan,
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  numeric?: boolean;
  title?: string;
  colSpan?: number;
}) {
  return (
    <td
      title={title}
      colSpan={colSpan}
      className={`border-b border-ink-100 px-3 py-2 ${ALIGN[align]} ${numeric ? "tnum" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

export function Callout({
  tone = "neutral",
  title,
  children,
}: {
  tone?: Tone;
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`rounded border px-3 py-2.5 text-[12.5px] leading-relaxed ${TONE_CLASSES[tone]}`}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div className={tone === "neutral" ? "text-ink-700" : ""}>{children}</div>
    </div>
  );
}

/** Marks anything the MVP has stubbed for a future integration. */
export function PlaceholderNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded border border-dashed border-ink-300 bg-ink-50 px-3 py-2 text-[12px] leading-relaxed text-ink-500">
      <span className="label-caps mr-1.5 text-ink-400">Placeholder</span>
      {children}
    </div>
  );
}

export function Bullets({ items, tone = "neutral" }: { items: string[]; tone?: Tone }) {
  if (items.length === 0) return <p className="text-[12.5px] text-ink-400">None identified.</p>;
  const dot =
    tone === "good" ? "bg-good-500" : tone === "bad" ? "bg-bad-500" : tone === "warn" ? "bg-warn-500" : "bg-ink-400";
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-700">
          <span className={`mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Button({
  children,
  onClick,
  href,
  variant = "secondary",
  type = "button",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded border px-3 py-1.5 text-[12.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
  const styles = {
    primary: "border-accent-700 bg-accent-600 text-white hover:bg-accent-700",
    secondary: "border-ink-200 bg-white text-ink-700 hover:bg-ink-50",
    ghost: "border-transparent bg-transparent text-ink-600 hover:bg-ink-100",
    danger: "border-bad-500/30 bg-white text-bad-500 hover:bg-bad-50",
  }[variant];
  const cls = `${base} ${styles} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-ink-300 bg-white px-6 py-10 text-center">
      <h3 className="text-[14px] font-semibold text-ink-800">{title}</h3>
      {children && <div className="mx-auto mt-1.5 max-w-md text-[12.5px] text-ink-500">{children}</div>}
    </div>
  );
}

export function KeyValue({
  rows,
  columns = 1,
}: {
  rows: Array<{ label: string; value: ReactNode }>;
  columns?: 1 | 2;
}) {
  return (
    <dl className={`grid grid-cols-1 gap-x-6 gap-y-0 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {rows.map((r, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 border-b border-ink-100 py-1.5">
          <dt className="text-[12.5px] text-ink-500">{r.label}</dt>
          <dd className="tnum text-right text-[12.5px] font-medium text-ink-900">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
