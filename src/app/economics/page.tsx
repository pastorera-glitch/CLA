"use client";

import Link from "next/link";

import { PageHeader } from "@/components/app-shell";
import { ComparisonBars, HBarChart } from "@/components/charts";
import { VerdictBadge } from "@/components/decision";
import { Button, Callout, Card, EmptyState, StatTile, Table, Td, Th } from "@/components/ui";
import { portfolioRollup } from "@/lib/engine";
import { money, moneyCompact, number, pct } from "@/lib/format";
import { usePortfolio, useStore } from "@/lib/store";

export default function PortfolioEconomicsPage() {
  const { ready, assumptions } = useStore();
  const { results, summaries } = usePortfolio();

  if (!ready) return <div className="py-16 text-center text-[13px] text-ink-400">Loading…</div>;
  if (results.length === 0) {
    return (
      <>
        <PageHeader title="Economics" />
        <EmptyState title="No properties to analyze">
          <Button href="/properties/new" variant="primary" className="mt-3">
            Start a new evaluation
          </Button>
        </EmptyState>
      </>
    );
  }

  const roll = portfolioRollup(summaries);
  const t = assumptions.thresholds;

  // Aggregate the cost stack across the book so the operator can see where the
  // money actually goes at portfolio level, not just per property.
  const costTotals = new Map<string, { label: string; amount: number }>();
  for (const r of results) {
    for (const line of r.economics.cost.lines) {
      const prev = costTotals.get(line.key);
      costTotals.set(line.key, { label: line.label, amount: (prev?.amount ?? 0) + line.amount });
    }
  }
  const costRows = [...costTotals.values()].filter((x) => x.amount > 0).sort((a, b) => b.amount - a.amount);
  const totalCost = costRows.reduce((s, x) => s + x.amount, 0);

  return (
    <>
      <PageHeader
        title="Economics"
        subtitle="Portfolio roll-up of property-level P&Ls. Thresholds are editable in Assumptions."
        actions={<Button href="/assumptions">Edit assumptions</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatTile label="Annual revenue" value={moneyCompact(roll.totalAnnualRevenue)} />
        <StatTile label="Direct operating cost" value={moneyCompact(totalCost)} />
        <StatTile label="Contribution" value={moneyCompact(roll.totalContribution)} />
        <StatTile
          label="Blended margin"
          value={pct(roll.blendedMarginPct)}
          tone={roll.blendedMarginPct >= t.targetContributionMarginPct ? "good" : roll.blendedMarginPct >= t.conditionalContributionMarginPct ? "warn" : "bad"}
        />
        <StatTile label="Capital deployed" value={moneyCompact(roll.totalUpfrontCapital)} />
        <StatTile label="Machines" value={roll.totalMachines} sub={`${number(roll.totalAutonomousAcres, 1)} autonomous acres`} />
      </div>

      <div className="mb-4 grid items-start gap-4 lg:grid-cols-3">
        <Card title="Portfolio cost stack" subtitle="Where the operating dollar goes across the book." className="lg:col-span-2">
          <HBarChart rows={costRows.map((x) => ({ label: x.label, value: x.amount }))} />
        </Card>
        <Card title="Contribution margin by property">
          <ComparisonBars
            rows={summaries.map((s) => ({
              key: s.id,
              label: s.name.split(" ").slice(0, 2).join(" "),
              value: Math.max(0, s.contributionMarginPct),
              sublabel: moneyCompact(s.contribution),
            }))}
            formatValue={(v) => pct(v, 0)}
          />
          <div className="mt-3">
            <Callout tone="neutral">
              Target {t.targetContributionMarginPct}% · Conditional {t.conditionalContributionMarginPct}% · Reject below{" "}
              {t.rejectContributionMarginPct}%.
            </Callout>
          </div>
        </Card>
      </div>

      <Card title="Property economics" dense>
        <Table>
          <thead>
            <tr>
              <Th>Property</Th>
              <Th align="right">Revenue</Th>
              <Th align="right">Direct cost</Th>
              <Th align="right">Contribution</Th>
              <Th align="right">Margin</Th>
              <Th align="right">Per acre</Th>
              <Th align="right">Per machine</Th>
              <Th align="right">Per tech hr</Th>
              <Th align="right">Capital</Th>
              <Th align="right">Payback</Th>
              <Th>Verdict</Th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.property.id} className="hover:bg-ink-50">
                <Td>
                  <Link href={`/properties/${r.property.id}/economics`} className="font-semibold text-accent-700 hover:underline">
                    {r.property.intake.name || "Untitled"}
                  </Link>
                </Td>
                <Td align="right" numeric>{money(r.economics.revenue.total)}</Td>
                <Td align="right" numeric>{money(r.economics.cost.total)}</Td>
                <Td align="right" numeric>{money(r.economics.contribution)}</Td>
                <Td align="right" numeric>{pct(r.economics.contributionMarginPct)}</Td>
                <Td align="right" numeric>{money(r.economics.contributionPerAutonomousAcre)}</Td>
                <Td align="right" numeric>{money(r.economics.contributionPerMachine)}</Td>
                <Td align="right" numeric>{money(r.economics.contributionPerTechnicianHour)}</Td>
                <Td align="right" numeric>{money(r.economics.upfrontOperatorCapital)}</Td>
                <Td align="right" numeric>
                  {r.economics.paybackYears === null ? "—" : `${number(r.economics.paybackYears, 2)} yr`}
                </Td>
                <Td><VerdictBadge verdict={r.economics.underwritingVerdict} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <Card title="Commissioning drag" subtitle="First-year contribution against steady state.">
          <Table>
            <thead>
              <tr>
                <Th>Property</Th>
                <Th align="right">Commissioning yr</Th>
                <Th align="right">Steady state</Th>
                <Th align="right">Drag</Th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.property.id}>
                  <Td>{r.property.intake.name || "Untitled"}</Td>
                  <Td align="right" numeric>{money(r.economics.commissioningYearContribution)}</Td>
                  <Td align="right" numeric>{money(r.economics.contribution)}</Td>
                  <Td align="right" numeric className="text-bad-500">
                    −{money(r.economics.contribution - r.economics.commissioningYearContribution)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card title="Labor intensity" subtitle="Technician hours consumed per property and what they return.">
          <Table>
            <thead>
              <tr>
                <Th>Property</Th>
                <Th align="right">Field hr</Th>
                <Th align="right">Travel hr</Th>
                <Th align="right">Remote hr</Th>
                <Th align="right">Contribution / tech hr</Th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.property.id}>
                  <Td>{r.property.intake.name || "Untitled"}</Td>
                  <Td align="right" numeric>{number(r.intervention.stabilized.fieldHoursTotal, 1)}</Td>
                  <Td align="right" numeric>{number(r.intervention.stabilized.travelHoursTotal, 1)}</Td>
                  <Td align="right" numeric>{number(r.intervention.stabilized.remoteHoursTotal, 1)}</Td>
                  <Td align="right" numeric>{money(r.economics.contributionPerTechnicianHour)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
