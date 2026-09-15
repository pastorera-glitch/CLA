"use client";

import Link from "next/link";

import { PageHeader } from "@/components/app-shell";
import { Badge, Button, Callout, Card, EmptyState, ScoreBar, Table, Td, Th } from "@/components/ui";
import { acres, number, pct } from "@/lib/format";
import { usePortfolio, useStore } from "@/lib/store";
import { READINESS_CATEGORIES, READINESS_CATEGORY_LABELS } from "@/lib/types";

export default function AssessmentOverviewPage() {
  const { ready } = useStore();
  const { results } = usePortfolio();

  if (!ready) return <div className="py-16 text-center text-[13px] text-ink-400">Loading…</div>;
  if (results.length === 0) {
    return (
      <>
        <PageHeader title="Site Assessment" />
        <EmptyState title="No properties to assess">
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
        title="Site Assessment"
        subtitle="Readiness scoring across the book. Open a property to edit its geometry, obstacle counts and ratings."
        actions={<Button href="/properties/new" variant="primary">New Evaluation</Button>}
      />

      <div className="mb-4">
        <Callout tone="accent" title="How the score is built">
          Nine weighted categories, each a small readable formula over the inputs the evaluator entered. Weights are
          editable in Assumptions. No site is ever auto-rejected — a poor category produces a flag naming the specific
          reason the score fell.
        </Callout>
      </div>

      <Card title="Readiness matrix" subtitle="Category sub-scores, 0–100. Red cells are the ones costing the most points." dense className="mb-4">
        <Table>
          <thead>
            <tr>
              <Th>Property</Th>
              {READINESS_CATEGORIES.map((c) => (
                <Th key={c} align="right" className="max-w-[80px] whitespace-normal">
                  {READINESS_CATEGORY_LABELS[c]}
                </Th>
              ))}
              <Th align="right">Score</Th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.property.id} className="hover:bg-ink-50">
                <Td>
                  <Link href={`/properties/${r.property.id}/assessment`} className="font-semibold text-accent-700 hover:underline">
                    {r.property.intake.name || "Untitled"}
                  </Link>
                </Td>
                {READINESS_CATEGORIES.map((c) => {
                  const cat = r.readiness.categories.find((x) => x.category === c)!;
                  return (
                    <Td key={c} align="right" numeric className={cellClass(cat.score)}>
                      {Math.round(cat.score)}
                    </Td>
                  );
                })}
                <Td align="right" numeric className="font-semibold">
                  {Math.round(r.readiness.score)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {results.map((r) => (
          <Card
            key={r.property.id}
            title={r.property.intake.name || "Untitled"}
            subtitle={`${acres(r.property.assessment.geometry.totalTurfAcres)} turf · ${pct(r.property.assessment.geometry.autonomousCompatiblePct, 0)} autonomous-compatible · ${r.property.assessment.geometry.mowingZoneCount} zones`}
            actions={<Badge tone={r.readiness.score >= 70 ? "good" : r.readiness.score >= 55 ? "warn" : "bad"}>{r.readiness.bandLabel}</Badge>}
          >
            <div className="space-y-2.5">
              {r.readiness.topDetractors.map((c) => (
                <div key={c.category}>
                  <ScoreBar score={c.score} label={c.label} right={`−${number(c.pointsLost, 1)} pts`} />
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-ink-100 pt-3">
              <h4 className="label-caps mb-1.5">Critical flags</h4>
              {r.readiness.flags.filter((f) => f.severity === "critical").length === 0 ? (
                <p className="text-[12px] text-ink-400">None.</p>
              ) : (
                <ul className="space-y-1">
                  {r.readiness.flags
                    .filter((f) => f.severity === "critical")
                    .slice(0, 4)
                    .map((f, i) => (
                      <li key={i} className="text-[12px] leading-relaxed text-ink-700">
                        • {f.message}
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <div className="mt-3">
              <Button href={`/properties/${r.property.id}/assessment`}>Open assessment</Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function cellClass(score: number): string {
  if (score >= 80) return "bg-good-50 text-good-700 font-medium";
  if (score >= 60) return "text-ink-700";
  if (score >= 40) return "bg-warn-50 text-warn-500 font-medium";
  return "bg-bad-50 text-bad-500 font-semibold";
}
