export function money(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function moneyCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${value < 0 ? "-" : ""}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `${value < 0 ? "-" : ""}$${(abs / 1000).toFixed(0)}k`;
  return money(value);
}

export function pct(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(decimals)}%`;
}

/** Percentages that blow past any sane range read as noise; cap them for display. */
export function pctCapped(value: number, cap = 300, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  if (value > cap) return `>${cap}%`;
  if (value < -cap) return `<-${cap}%`;
  return pct(value, decimals);
}

export function number(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function acres(value: number): string {
  return `${number(value, 2)} ac`;
}

export function hours(value: number): string {
  return `${number(value, 1)} hr`;
}

export function dateLabel(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function titleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
