"use client";

import type { ReactNode } from "react";

const CONTROL =
  "w-full rounded border border-ink-200 bg-white px-2.5 py-1.5 text-ink-900 outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-100";

export function FieldGrid({ children, cols = 3 }: { children: ReactNode; cols?: 1 | 2 | 3 | 4 }) {
  const map = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  } as const;
  return <div className={`grid gap-x-4 gap-y-3 ${map[cols]}`}>{children}</div>;
}

function Label({ label, help, htmlFor }: { label: string; help?: string; htmlFor?: string }) {
  return (
    <>
      <label htmlFor={htmlFor} className="label-caps block">
        {label}
      </label>
      {help && <p className="mt-0.5 mb-1 text-[11px] leading-snug text-ink-400">{help}</p>}
    </>
  );
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function NumberField({
  label,
  value,
  onChange,
  help,
  suffix,
  min,
  max,
  step = "any",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  help?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number | "any";
}) {
  const id = nextId("num");
  return (
    <div>
      <Label label={label} help={help} htmlFor={id} />
      <div className="relative">
        <input
          id={id}
          type="number"
          className={`tnum mt-0.5 ${CONTROL} ${suffix ? "pr-12" : ""}`}
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-ink-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  help,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  placeholder?: string;
  type?: "text" | "date";
}) {
  const id = nextId("txt");
  return (
    <div>
      <Label label={label} help={help} htmlFor={id} />
      <input
        id={id}
        type={type}
        className={`mt-0.5 ${CONTROL}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  help,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  rows?: number;
}) {
  const id = nextId("ta");
  return (
    <div className="col-span-full">
      <Label label={label} help={help} htmlFor={id} />
      <textarea
        id={id}
        rows={rows}
        className={`mt-0.5 resize-y ${CONTROL}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  help,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  help?: string;
}) {
  const id = nextId("sel");
  return (
    <div>
      <Label label={label} help={help} htmlFor={id} />
      <select id={id} className={`mt-0.5 ${CONTROL}`} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ToggleField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  help?: string;
}) {
  return (
    <div>
      <Label label={label} help={help} />
      <button
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        className={`mt-0.5 inline-flex items-center gap-2 rounded border px-2.5 py-1.5 text-[12.5px] font-semibold transition ${
          value ? "border-accent-200 bg-accent-50 text-accent-700" : "border-ink-200 bg-white text-ink-500"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-6 rounded-full transition ${value ? "bg-accent-600" : "bg-ink-300"} relative`}
        >
          <span
            className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-all ${value ? "left-3" : "left-0.5"}`}
          />
        </span>
        {value ? "Yes" : "No"}
      </button>
    </div>
  );
}

/**
 * 1–5 favorability rating. The scale is always oriented so 5 is the most
 * favorable condition for autonomous mowing; the endpoint captions keep the
 * evaluator honest about direction.
 */
export function RatingField({
  label,
  value,
  onChange,
  help,
  low,
  high,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  help?: string;
  low: string;
  high: string;
}) {
  return (
    <div>
      <Label label={label} help={help} />
      <div className="mt-1 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-label={`${label}: ${n} of 5`}
              aria-pressed={active}
              className={`tnum h-7 flex-1 rounded border text-[12px] font-semibold transition ${
                active
                  ? "border-accent-700 bg-accent-600 text-white"
                  : "border-ink-200 bg-white text-ink-500 hover:border-accent-200 hover:bg-accent-50"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10.5px] leading-tight text-ink-400">
        <span>1 · {low}</span>
        <span className="text-right">5 · {high}</span>
      </div>
    </div>
  );
}

/** 0–100 percentage with a slider plus an exact numeric entry. */
export function PercentField({
  label,
  value,
  onChange,
  help,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  help?: string;
  min?: number;
  max?: number;
}) {
  const id = nextId("pctf");
  return (
    <div>
      <Label label={label} help={help} htmlFor={id} />
      <div className="mt-0.5 flex items-center gap-2">
        <input
          type="range"
          className="h-1.5 flex-1 cursor-pointer"
          min={min}
          max={max}
          step={1}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
        />
        <div className="relative w-20">
          <input
            id={id}
            type="number"
            className={`tnum pr-6 ${CONTROL}`}
            min={min}
            max={max}
            value={Number.isFinite(value) ? value : 0}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-ink-400">
            %
          </span>
        </div>
      </div>
    </div>
  );
}

export function FieldSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-ink-100 pt-4 first:border-0 first:pt-0">
      <h3 className="text-[12.5px] font-semibold text-ink-800">{title}</h3>
      {description && <p className="mb-3 mt-0.5 text-[11.5px] leading-snug text-ink-500">{description}</p>}
      <div className={description ? "" : "mt-3"}>{children}</div>
    </div>
  );
}
