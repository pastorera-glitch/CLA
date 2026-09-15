"use client";

import Link from "next/link";

import { PageHeader } from "@/components/app-shell";
import { ComparisonBars } from "@/components/charts";
import { DecisionBadge } from "@/components/decision";
import { Badge, Button, Callout, Card, EmptyState, ScoreBar, StatTile, Table, Td, Th, scoreTone } from "@/components/ui";
import { portfolioRollup } from "@/lib/engine";
import { acres, money, moneyCompact, number, pct, pctCapped } from "@/lib/format";
import { usePortfolio, useStore } from "@/lib/store";
import { PROPERTY_TYPE_LABELS } from "@/lib/types";
import { propertyHref } from "@/lib/routes";

export default function DashboardPage() {
  const { ready, assumptions } = useStore();
  const { summaries, results } = usePortfolio();

  if (!ready) return <LoadingState />;
  if (summaries.length === 0) {
    return (
      <>
        <PageHeader title="Portfolio Dashboard" />
        <EmptyState title="No properties yet">
          <Button href="/properties/new" variant="primary" className="mt-3">
            Start a new evaluation
          </Button>
        </EmptyState>
      </>
    );
  }

  const roll = portfolioRollup(summaries);
  const marginTone =
    roll.blendedMarginPct >= assumptions.thresholds.targetContributionMarginPct
      ? "good"
      : roll.blendedMarginPct >= assumptions.thresholds.conditionalContributionMarginPct
        ? "warn"
        : "bad";

  const allFlags = results.flatMap((r) =>
    r.readiness.flags
      .filter((f) => f.severity === "critical")
      .map((f) => ({ property: r.property.intake.name, id: r.property.id, message: f.message })),
  );

  return (
    <>
      <PageHeader
        title="Portfolio Dashboard"
        subtitle="Pipeline of commercial sites screened for leave-behind autonomous mowing."
        actions={
          <>
            <Button href="/reports">Reports</Button>
            <Button href="/properties/new" variant="primary">
              New Evaluation
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatTile label="Properties" value={roll.propertyCount} sub={`${roll.pursueCount} pursuing · ${roll.rejectCount} rejected`} />
        <StatTile label="Autonomous Acres" value={number(roll.totalAutonomousAcres, 1)} sub={`${roll.totalMachines} live machines`} />
        <StatTile label="Annual Service Revenue" value={moneyCompact(roll.totalAnnualRevenue)} sub="At recommended pricing" />
        <StatTile label="Property Contribution" value={moneyCompact(roll.totalContribution)} sub="Steady-state, pre-overhead" />
        <StatTile
          label="Blended Margin"
          value={pct(roll.blendedMarginPct)}
          tone={marginTone}
          sub={`Target ${assumptions.thresholds.targetContributionMarginPct}%`}
        />
        <StatTile label="Capital Required" value={moneyCompact(roll.totalUpfrontCapital)} sub="Fleet + deployment" />
      </div>

      <Card
        title="Property pipeline"
        subtitle="Every column below is computed by the underwriting engine from the site inputs."
        className="mb-4"
        dense
      >
          <Table>
            <thead>
              <tr>
                <Th>Property</Th>
                <Th align="right">Auto. ac</Th>
                <Th align="right">Ready</Th>
                <Th align="right">Opp.</Th>
                <Th>Machine</Th>
                <Th align="right">Units</Th>
                <Th align="right">Price</Th>
                <Th align="right">Savings</Th>
                <Th align="right">Margin</Th>
                <Th>Decision</Th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr key={s.id} className="hover:bg-ink-50">
                  <Td className="min-w-[210px]">
                    <Link href={propertyHref(s.id)} className="font-semibold text-accent-700 hover:underline">
                      {s.name || "Untitled property"}
                    </Link>
                    <div className="max-w-[230px] truncate text-[11px] text-ink-400" title={s.address}>
                      {PROPERTY_TYPE_LABELS[s.propertyType]} · {s.address || "No address"}
                    </div>
                  </Td>
                  <Td align="right" numeric>
                    {number(s.autonomousAcres, 2)}
                  </Td>
                  <Td align="right" numeric>
                    <span className={`font-semibold ${toneText(s.readinessScore)}`}>{Math.round(s.readinessScore)}</span>
                  </Td>
                  <Td align="right" numeric>
                    <span className={`font-semibold ${toneText(s.opportunityScore)}`}>
                      {Math.round(s.opportunityScore)}
                    </span>
                  </Td>
                  <Td className="max-w-[190px] truncate text-ink-600" title={s.recommendedProduct}>
                    {s.recommendedProduct}
                  </Td>
                  <Td align="right" numeric>
                    {s.machinesRequired}
                  </Td>
                  <Td align="right" numeric>
                    {money(s.annualServicePrice)}
                  </Td>
                  <Td align="right" numeric>
                    <span className={s.customerSavings >= 0 ? "text-good-700" : "text-bad-500"}>
                      {pctCapped(s.customerSavingsPct)}
                    </span>
                  </Td>
                  <Td align="right" numeric>
                    <span
                      className={
                        s.contributionMarginPct >= assumptions.thresholds.targetContributionMarginPct
                          ? "font-semibold text-good-700"
                          : s.contributionMarginPct >= assumptions.thresholds.conditionalContributionMarginPct
                            ? "text-warn-500"
                            : "text-bad-500"
                      }
                    >
                      {pct(s.contributionMarginPct)}
                    </span>
                  </Td>
                  <Td>
                    <DecisionBadge decision={s.decision} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
      </Card>

      <div className="mb-4 grid items-start gap-4 lg:grid-cols-3">
          <Card title="Readiness by property" subtitle="0–100 weighted Robot Readiness Score.">
            <div className="space-y-3">
              {summaries.map((s) => (
                <ScoreBar
                  key={s.id}
                  score={s.readinessScore}
                  label={s.name}
                  right={`${Math.round(s.readinessScore)} · ${s.readinessBandLabel}`}
                />
              ))}
            </div>
          </Card>
          <Card title="Contribution by property" subtitle="Steady-state annual property contribution.">
            <ComparisonBars
              rows={summaries.map((s) => ({
                key: s.id,
                label: s.name.split(" ").slice(0, 2).join(" "),
                value: Math.max(0, s.contribution),
                sublabel: pct(s.contributionMarginPct, 0),
              }))}
              formatValue={moneyCompact}
            />
          </Card>
        <Card title="Critical flags across the book" subtitle="Score detractors the engine raised. No site is auto-rejected.">
          {allFlags.length === 0 ? (
            <p className="text-[12.5px] text-ink-400">No critical flags.</p>
          ) : (
            <ul className="space-y-2">
              {allFlags.slice(0, 10).map((f, i) => (
                <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed">
                  <Badge tone="bad">Critical</Badge>
                  <span className="text-ink-700">
                    <Link href={propertyHref(f.id)} className="font-semibold text-accent-700 hover:underline">
                      {f.property}
                    </Link>{" "}
                    — {f.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4">
        <Card title="Underwriting framework" subtitle="Thresholds are editable in Assumptions.">
          <div className="space-y-2.5 text-[12.5px] text-ink-700">
            <Callout tone="good" title={`Target — ${assumptions.thresholds.targetContributionMarginPct}%+ contribution`}>
              Steady-state property contribution at or above target. Pursue where readiness supports it.
            </Callout>
            <Callout
              tone="warn"
              title={`Conditional — ${assumptions.thresholds.conditionalContributionMarginPct}–${assumptions.thresholds.targetContributionMarginPct}%`}
            >
              Acceptable only where cluster density or strategic portfolio value is strong.
            </Callout>
            <Callout tone="bad" title={`Watch — below ${assumptions.thresholds.rejectContributionMarginPct}%`}>
              Generally reject. The purpose of this screen is to disqualify weak sites before a site visit.
            </Callout>
            <div className="pt-1 text-[11.5px] text-ink-500">
              Portfolio totals: {acres(roll.totalAutonomousAcres)} autonomous, average readiness{" "}
              {number(roll.avgReadiness, 0)}, average opportunity {number(roll.avgOpportunity, 0)}.
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function toneText(score: number) {
  const t = scoreTone(score);
  return t === "good" ? "text-good-700" : t === "accent" ? "text-accent-700" : t === "warn" ? "text-warn-500" : "text-bad-500";
}

export function LoadingState() {
  return <div className="py-16 text-center text-[13px] text-ink-400">Loading underwriting workspace…</div>;
}
