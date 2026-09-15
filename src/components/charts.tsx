"use client";

import { money } from "@/lib/format";

/** Horizontal bar chart for cost/revenue breakdowns. No chart library needed. */
export function HBarChart({
  rows,
  formatValue = (v: number) => money(v),
  color = "#1f4f88",
  negativeColor = "#a3312a",
}: {
  rows: Array<{ label: string; value: number; hint?: string }>;
  formatValue?: (v: number) => string;
  color?: string;
  negativeColor?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div>
            <div className="mb-0.5 flex items-baseline justify-between gap-2">
              <span className="truncate text-[12px] text-ink-700" title={r.hint ?? r.label}>
                {r.label}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-sm bg-ink-100">
              <div
                className="h-2 rounded-sm"
                style={{
                  width: `${(Math.abs(r.value) / max) * 100}%`,
                  background: r.value < 0 ? negativeColor : color,
                }}
              />
            </div>
          </div>
          <span className="tnum w-24 text-right text-[12px] font-medium text-ink-900">{formatValue(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Grouped comparison bars, e.g. required price by contract structure. */
export function ComparisonBars({
  rows,
  formatValue = (v: number) => money(v),
  highlightKey,
}: {
  rows: Array<{ key: string; label: string; value: number; sublabel?: string }>;
  formatValue?: (v: number) => string;
  highlightKey?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex items-end gap-2 overflow-x-auto pb-1" style={{ minHeight: 170 }}>
      {rows.map((r) => {
        const active = r.key === highlightKey;
        return (
          <div key={r.key} className="flex min-w-[78px] flex-1 flex-col items-center justify-end gap-1.5">
            <span className="tnum text-[11.5px] font-semibold text-ink-900">{formatValue(r.value)}</span>
            <div
              className={`w-full rounded-t ${active ? "bg-accent-600" : "bg-accent-200"}`}
              style={{ height: `${Math.max(4, (r.value / max) * 110)}px` }}
            />
            <span
              className={`text-center text-[10.5px] leading-tight ${active ? "font-semibold text-ink-900" : "text-ink-500"}`}
            >
              {r.label}
            </span>
            {r.sublabel && <span className="text-center text-[10px] leading-tight text-ink-400">{r.sublabel}</span>}
          </div>
        );
      })}
    </div>
  );
}

/** Stacked composition bar, e.g. intervention category mix. */
export function StackedBar({
  segments,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-sm">
        {segments.map((s, i) => (
          <div
            key={i}
            style={{ width: `${(Math.max(0, s.value) / total) * 100}%`, background: s.color }}
            title={`${s.label}: ${((s.value / total) * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11.5px] text-ink-600">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="truncate">{s.label}</span>
            <span className="tnum ml-auto font-medium text-ink-800">{((s.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const CATEGORY_COLORS = [
  "#1f4f88",
  "#4a7fc1",
  "#1f7a4d",
  "#a86a12",
  "#a3312a",
  "#67718a",
  "#163a66",
  "#8b95ab",
  "#b7bece",
];

/** Waterfall from revenue down to contribution. */
export function Waterfall({
  revenue,
  costs,
  contribution,
}: {
  revenue: number;
  costs: Array<{ label: string; amount: number }>;
  contribution: number;
}) {
  const scale = Math.max(revenue, 1);
  let running = revenue;
  return (
    <div className="space-y-1">
      <Row label="Revenue" value={revenue} width={100} color="#1f7a4d" />
      {costs
        .filter((c) => Math.abs(c.amount) > 0.5)
        .map((c, i) => {
          const before = running;
          running -= c.amount;
          return (
            <Row
              key={i}
              label={c.label}
              value={-c.amount}
              width={(c.amount / scale) * 100}
              offset={(Math.min(before, running) / scale) * 100}
              color="#a3312a"
            />
          );
        })}
      <Row
        label="Property contribution"
        value={contribution}
        width={(Math.abs(contribution) / scale) * 100}
        color={contribution >= 0 ? "#1f4f88" : "#a3312a"}
        bold
      />
    </div>
  );
}

function Row({
  label,
  value,
  width,
  offset = 0,
  color,
  bold = false,
}: {
  label: string;
  value: number;
  width: number;
  offset?: number;
  color: string;
  bold?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,150px)_minmax(0,1fr)_auto] items-center gap-2">
      <span className={`truncate text-[11.5px] ${bold ? "font-semibold text-ink-900" : "text-ink-600"}`}>{label}</span>
      <div className="relative h-3.5 w-full rounded-sm bg-ink-100">
        <div
          className="absolute top-0 h-3.5 rounded-sm"
          style={{ left: `${Math.max(0, offset)}%`, width: `${Math.max(0.6, Math.min(100, width))}%`, background: color }}
        />
      </div>
      <span className={`tnum w-24 text-right text-[11.5px] ${bold ? "font-semibold" : ""} text-ink-900`}>
        {money(value)}
      </span>
    </div>
  );
}
