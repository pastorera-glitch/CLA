/** Shared numeric helpers for the calculation engine. No React, no DOM. */

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clamp100(value: number): number {
  return clamp(value, 0, 100);
}

/** Converts a 1–5 favorability rating into a 0–100 sub-score. */
export function ratingToScore(rating: number): number {
  return clamp100(((clamp(rating, 1, 5) - 1) / 4) * 100);
}

/** Safe division that returns `fallback` instead of Infinity/NaN. */
export function div(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return fallback;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

export function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Weighted average of {value, weight} pairs, ignoring zero-weight entries. */
export function weightedAverage(entries: Array<{ value: number; weight: number }>): number {
  let totalWeight = 0;
  let total = 0;
  for (const e of entries) {
    if (!Number.isFinite(e.value) || !Number.isFinite(e.weight) || e.weight <= 0) continue;
    total += e.value * e.weight;
    totalWeight += e.weight;
  }
  return div(total, totalWeight, 0);
}

/**
 * Maps a value onto 0–100 where `best` scores 100 and `worst` scores 0.
 * Works in either direction (best may be lower than worst).
 */
export function scaleScore(value: number, best: number, worst: number): number {
  if (best === worst) return 50;
  return clamp100(((value - worst) / (best - worst)) * 100);
}

/** Capital recovery factor: annual payment that amortizes 1.0 over n years at rate r. */
export function capitalRecoveryFactor(ratePct: number, years: number): number {
  const r = ratePct / 100;
  if (years <= 0) return 1;
  if (r === 0) return 1 / years;
  return (r * Math.pow(1 + r, years)) / (Math.pow(1 + r, years) - 1);
}

/** Present value of a single amount received `years` from now. */
export function presentValue(amount: number, ratePct: number, years: number): number {
  const r = ratePct / 100;
  return div(amount, Math.pow(1 + r, years), amount);
}

/** Annual level payment on an amortizing loan. */
export function annualLoanPayment(principal: number, aprPct: number, years: number): number {
  return principal * capitalRecoveryFactor(aprPct, years);
}

export function round(value: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round((Number.isFinite(value) ? value : 0) * f) / f;
}

/** Normalizes a record of percent shares so the values sum to 100. */
export function normalizeShares<K extends string>(shares: Record<K, number>): Record<K, number> {
  const keys = Object.keys(shares) as K[];
  const total = keys.reduce((sum, k) => sum + Math.max(0, num(shares[k])), 0);
  const out = {} as Record<K, number>;
  if (total <= 0) {
    const even = 100 / Math.max(1, keys.length);
    for (const k of keys) out[k] = even;
    return out;
  }
  for (const k of keys) out[k] = (Math.max(0, num(shares[k])) / total) * 100;
  return out;
}
