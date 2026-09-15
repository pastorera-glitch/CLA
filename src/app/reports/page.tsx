"use client";

import Link from "next/link";

import { PageHeader } from "@/components/app-shell";
import { DecisionBadge, VerdictBadge } from "@/components/decision";
import { Button, Callout, Card, EmptyState, Table, Td, Th } from "@/components/ui";
import { acres, dateLabel, money, pct } from "@/lib/format";
import { usePortfolio, useStore } from "@/lib/store";

const SECTIONS = [
  "Property overview",
  "Site characteristics",
  "Robot-readiness scoring",
  "Aerial / site measurement placeholders",
  "Equipment recommendation",
  "Deployment plan",
  "Human-in-the-loop requirements",
  "Existing landscaper / residual-scope plan",
  "Customer value proposition",
  "Pricing",
  "Operator economics",
  "Risks",
  "Recommendation",
  "Open diligence items",
];

export default function ReportsPage() {
  const { ready } = useStore();
  const { results } = usePortfolio();

  if (!ready) return <div className="py-16 text-center text-[13px] text-ink-400">Loading…</div>;
  if (results.length === 0) {
    return (
      <>
        <PageHeader title="Reports" />
        <EmptyState title="No reports yet">
          <Button href="/properties/new" variant="primary" className="mt-3">
            Start a new evaluation
          </Button>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Standardized site evaluation summaries, printable to PDF from the browser."
      />

      <div className="mb-4">
        <Callout tone="accent" title="What the report is for">
          A file that can be reviewed before anyone drives to the property. It states the score, the equipment, the
          expected support burden, the price, the economics and — explicitly — what would break the model.
        </Callout>
      </div>

      <Card title="Available reports" dense className="mb-4">
        <Table>
          <thead>
            <tr>
              <Th>Property</Th>
              <Th>Last updated</Th>
              <Th align="right">Readiness</Th>
              <Th align="right">Opportunity</Th>
              <Th align="right">Autonomous acres</Th>
              <Th align="right">Annual price</Th>
              <Th align="right">Margin</Th>
              <Th>Verdict</Th>
              <Th>Decision</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.property.id} className="hover:bg-ink-50">
                <Td>
                  <Link href={`/properties/${r.property.id}/report`} className="font-semibold text-accent-700 hover:underline">
                    {r.property.intake.name || "Untitled"}
                  </Link>
                  <div className="text-[11px] text-ink-400">
                    {[r.property.intake.city, r.property.intake.state].filter(Boolean).join(", ")}
                  </div>
                </Td>
                <Td className="whitespace-nowrap text-ink-600">{dateLabel(r.property.updatedAt)}</Td>
                <Td align="right" numeric>{Math.round(r.readiness.score)}</Td>
                <Td align="right" numeric>{Math.round(r.recommendation.opportunityScore)}</Td>
                <Td align="right" numeric>{acres(r.equipment.autonomousAcres)}</Td>
                <Td align="right" numeric>{money(r.value.recommendedAnnualPrice)}</Td>
                <Td align="right" numeric>{pct(r.economics.contributionMarginPct)}</Td>
                <Td><VerdictBadge verdict={r.economics.underwritingVerdict} /></Td>
                <Td><DecisionBadge decision={r.recommendation.decision} overridden={r.recommendation.decisionIsOverridden} /></Td>
                <Td align="right">
                  <Button href={`/properties/${r.property.id}/report`}>Open</Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card title="Report contents" subtitle="Every report carries the same fourteen sections so files are comparable at committee.">
        <ol className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s, i) => (
            <li key={s} className="flex gap-2 border-b border-ink-100 py-1.5 text-[12.5px] text-ink-700">
              <span className="tnum w-5 shrink-0 text-ink-400">{i + 1}.</span>
              {s}
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
