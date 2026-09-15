"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app-shell";
import { DecisionBadge } from "@/components/decision";
import { Button, Card, EmptyState, Table, Td, Th } from "@/components/ui";
import { money, number, pct, pctCapped } from "@/lib/format";
import { usePortfolio, useStore } from "@/lib/store";
import { DECISION_STATUS_LABELS, PROPERTY_TYPE_LABELS, type DecisionStatus } from "@/lib/types";
import { propertyHref } from "@/lib/routes";

type SortKey = "name" | "readiness" | "opportunity" | "margin" | "acres" | "price";

export default function PropertiesPage() {
  const { ready, deleteProperty } = useStore();
  const { summaries } = usePortfolio();
  const [query, setQuery] = useState("");
  const [decision, setDecision] = useState<DecisionStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("opportunity");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = summaries.filter((s) => {
      const matchesQuery =
        !q || `${s.name} ${s.address} ${s.recommendedProduct}`.toLowerCase().includes(q);
      const matchesDecision = decision === "all" || s.decision === decision;
      return matchesQuery && matchesDecision;
    });
    const by: Record<SortKey, (a: typeof filtered[number], b: typeof filtered[number]) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      readiness: (a, b) => b.readinessScore - a.readinessScore,
      opportunity: (a, b) => b.opportunityScore - a.opportunityScore,
      margin: (a, b) => b.contributionMarginPct - a.contributionMarginPct,
      acres: (a, b) => b.autonomousAcres - a.autonomousAcres,
      price: (a, b) => b.annualServicePrice - a.annualServicePrice,
    };
    return [...filtered].sort(by[sort]);
  }, [summaries, query, decision, sort]);

  if (!ready) return <div className="py-16 text-center text-[13px] text-ink-400">Loading…</div>;

  return (
    <>
      <PageHeader
        title="Properties"
        subtitle={`${summaries.length} evaluation${summaries.length === 1 ? "" : "s"} in the book.`}
        actions={
          <Button href="/properties/new" variant="primary">
            New Evaluation
          </Button>
        }
      />

      <Card dense>
        <div className="flex flex-wrap items-end gap-3 border-b border-ink-200 px-4 py-3">
          <div className="min-w-[200px] flex-1">
            <label className="label-caps block" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              className="mt-0.5 w-full rounded border border-ink-200 px-2.5 py-1.5 outline-none focus:border-accent-400"
              placeholder="Name, address or equipment"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div>
            <label className="label-caps block" htmlFor="dec">
              Decision
            </label>
            <select
              id="dec"
              className="mt-0.5 rounded border border-ink-200 px-2.5 py-1.5"
              value={decision}
              onChange={(e) => setDecision(e.target.value as DecisionStatus | "all")}
            >
              <option value="all">All</option>
              {Object.entries(DECISION_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-caps block" htmlFor="sort">
              Sort by
            </label>
            <select
              id="sort"
              className="mt-0.5 rounded border border-ink-200 px-2.5 py-1.5"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="opportunity">Opportunity score</option>
              <option value="readiness">Readiness score</option>
              <option value="margin">Contribution margin</option>
              <option value="acres">Autonomous acres</option>
              <option value="price">Annual price</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No properties match">Adjust the filters or start a new evaluation.</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Property</Th>
                <Th align="right">Turf</Th>
                <Th align="right">Autonomous</Th>
                <Th align="right">Readiness</Th>
                <Th align="right">Opportunity</Th>
                <Th align="right">Cluster</Th>
                <Th>Equipment</Th>
                <Th align="right">Units</Th>
                <Th align="right">Annual price</Th>
                <Th align="right">Savings</Th>
                <Th align="right">Margin</Th>
                <Th align="right">Capital</Th>
                <Th>Decision</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-ink-50">
                  <Td className="min-w-[230px]">
                    <Link href={propertyHref(s.id)} className="font-semibold text-accent-700 hover:underline">
                      {s.name || "Untitled"}
                    </Link>
                    <div
                      className="max-w-[250px] truncate text-[11px] text-ink-400"
                      title={`${PROPERTY_TYPE_LABELS[s.propertyType]} · ${s.address}`}
                    >
                      {PROPERTY_TYPE_LABELS[s.propertyType]} · {s.address || "No address"}
                    </div>
                  </Td>
                  <Td align="right" numeric>{number(s.totalTurfAcres, 1)}</Td>
                  <Td align="right" numeric>{number(s.autonomousAcres, 2)}</Td>
                  <Td align="right" numeric>{Math.round(s.readinessScore)}</Td>
                  <Td align="right" numeric>{Math.round(s.opportunityScore)}</Td>
                  <Td align="right" numeric>{Math.round(s.clusterScore)}</Td>
                  <Td className="max-w-[190px] truncate text-ink-600" title={s.recommendedProduct}>
                    {s.recommendedProduct}
                  </Td>
                  <Td align="right" numeric>{s.machinesRequired}</Td>
                  <Td align="right" numeric>{money(s.annualServicePrice)}</Td>
                  <Td align="right" numeric className={s.customerSavings >= 0 ? "text-good-700" : "text-bad-500"}>
                    {pctCapped(s.customerSavingsPct)}
                  </Td>
                  <Td align="right" numeric>{pct(s.contributionMarginPct)}</Td>
                  <Td align="right" numeric>{money(s.upfrontCapital)}</Td>
                  <Td><DecisionBadge decision={s.decision} /></Td>
                  <Td align="right">
                    <button
                      type="button"
                      className="text-[11.5px] font-semibold text-bad-500 hover:underline"
                      onClick={() => {
                        if (window.confirm(`Delete "${s.name || "Untitled"}"? This cannot be undone.`)) {
                          deleteProperty(s.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
