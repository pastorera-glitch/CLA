"use client";

import { HBarChart, Waterfall } from "@/components/charts";
import { VerdictBadge } from "@/components/decision";
import { FieldGrid, NumberField, TextAreaField, ToggleField } from "@/components/fields";
import { PropertyWorkspace } from "@/components/property-page";
import { Callout, Card, KeyValue, StatTile, Table, Td, Th } from "@/components/ui";
import { money, number, pct } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function EconomicsPage() {
  const { assumptions } = useStore();
  const t = assumptions.thresholds;

  return (
    <PropertyWorkspace
      title="Operator Economics"
      subtitle="Property-level P&L at steady state. Every cost line states how it is derived; thresholds are editable in Assumptions."
    >
      {({ property, result, update }) => {
        const e = result.economics;
        const marginTone =
          e.contributionMarginPct >= t.targetContributionMarginPct
            ? "good"
            : e.contributionMarginPct >= t.conditionalContributionMarginPct
              ? "warn"
              : "bad";

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              <StatTile label="Annual revenue" value={money(e.revenue.total)} sub="Service + amortized implementation" />
              <StatTile label="Direct operating cost" value={money(e.cost.total)} sub="Incl. capital recovery" />
              <StatTile label="Property contribution" value={money(e.contribution)} tone={marginTone} sub="Pre-overhead" />
              <StatTile label="Contribution margin" value={pct(e.contributionMarginPct)} tone={marginTone} sub={`Target ${t.targetContributionMarginPct}%`} />
              <StatTile label="Upfront capital" value={money(e.upfrontOperatorCapital)} sub="Fleet + deployment, net of fees" />
              <StatTile
                label="Payback"
                value={e.paybackYears === null ? "—" : `${number(e.paybackYears, 2)} yr`}
                sub={e.breakEvenDate ? `Break-even ${e.breakEvenDate}` : "Never at this price"}
              />
            </div>

            <Card title="Underwriting verdict" actions={<VerdictBadge verdict={e.underwritingVerdict} />}>
              <p className="text-[13px] leading-relaxed text-ink-700">{e.verdictNarrative}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Callout tone="good" title={`Target — ${t.targetContributionMarginPct}%+`}>Steady-state contribution at or above target.</Callout>
                <Callout tone="warn" title={`Conditional — ${t.conditionalContributionMarginPct}–${t.targetContributionMarginPct}%`}>
                  Acceptable where cluster density or strategic value is strong.
                </Callout>
                <Callout tone="bad" title={`Watch — below ${t.rejectContributionMarginPct}%`}>Generally reject.</Callout>
              </div>
            </Card>

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <Card title="Property P&L" subtitle="Steady state, one full season." dense>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Line</Th>
                        <Th>Basis</Th>
                        <Th align="right">Amount</Th>
                        <Th align="right">% of revenue</Th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-ink-50">
                        <Td className="font-semibold text-ink-900">Revenue</Td>
                        <Td />
                        <Td />
                        <Td />
                      </tr>
                      {e.revenue.lines.map((l) => (
                        <tr key={l.key}>
                          <Td className="pl-6">{l.label}</Td>
                          <Td className="text-[11.5px] text-ink-500">{l.basis}</Td>
                          <Td align="right" numeric>{money(l.amount)}</Td>
                          <Td align="right" numeric>{pct((l.amount / Math.max(1, e.revenue.total)) * 100, 0)}</Td>
                        </tr>
                      ))}
                      <tr>
                        <Td className="font-semibold text-ink-900">Total revenue</Td>
                        <Td />
                        <Td align="right" numeric className="font-semibold">{money(e.revenue.total)}</Td>
                        <Td align="right" numeric>100%</Td>
                      </tr>

                      <tr className="bg-ink-50">
                        <Td className="font-semibold text-ink-900">Direct operating cost</Td>
                        <Td />
                        <Td />
                        <Td />
                      </tr>
                      {e.cost.lines.map((l) => (
                        <tr key={l.key}>
                          <Td className="pl-6">{l.label}</Td>
                          <Td className="text-[11.5px] text-ink-500">{l.basis}</Td>
                          <Td align="right" numeric>{money(l.amount)}</Td>
                          <Td align="right" numeric>{pct((l.amount / Math.max(1, e.revenue.total)) * 100, 0)}</Td>
                        </tr>
                      ))}
                      <tr>
                        <Td className="font-semibold text-ink-900">Total direct cost</Td>
                        <Td />
                        <Td align="right" numeric className="font-semibold">{money(e.cost.total)}</Td>
                        <Td align="right" numeric>{pct((e.cost.total / Math.max(1, e.revenue.total)) * 100, 0)}</Td>
                      </tr>
                      <tr className="bg-accent-50">
                        <Td className="font-semibold text-ink-900">Property contribution</Td>
                        <Td />
                        <Td align="right" numeric className="font-semibold">{money(e.contribution)}</Td>
                        <Td align="right" numeric className="font-semibold">{pct(e.contributionMarginPct)}</Td>
                      </tr>
                    </tbody>
                  </Table>
                </Card>

                <Card title="Revenue to contribution">
                  <Waterfall
                    revenue={e.revenue.total}
                    costs={e.cost.lines.map((l) => ({ label: l.label, amount: l.amount }))}
                    contribution={e.contribution}
                  />
                </Card>

                <Card title="Cost composition">
                  <HBarChart
                    rows={[...e.cost.lines]
                      .filter((l) => l.amount > 0)
                      .sort((a, b) => b.amount - a.amount)
                      .map((l) => ({ label: l.label, value: l.amount, hint: l.basis }))}
                  />
                </Card>
              </div>

              <div className="space-y-4">
                <Card title="Unit economics">
                  <KeyValue
                    rows={[
                      { label: "Contribution per autonomous acre", value: money(e.contributionPerAutonomousAcre) },
                      { label: "Contribution per machine", value: money(e.contributionPerMachine) },
                      { label: "Contribution per technician hour", value: money(e.contributionPerTechnicianHour) },
                      { label: "Technician hours consumed", value: `${number(e.totalTechnicianHours, 1)} hr` },
                      { label: "Revenue per autonomous acre", value: money(result.value.costPerAutonomousAcre) },
                      { label: "Machine utilization", value: pct(result.equipment.utilizationPct, 0) },
                    ]}
                  />
                </Card>

                <Card title="Commissioning year" subtitle="Same revenue, higher intervention load.">
                  <KeyValue
                    rows={[
                      { label: "Commissioning contribution", value: money(e.commissioningYearContribution) },
                      { label: "Commissioning margin", value: pct(e.commissioningYearMarginPct) },
                      { label: "Steady-state contribution", value: money(e.contribution) },
                      { label: "Steady-state margin", value: pct(e.contributionMarginPct) },
                      { label: "Drag from commissioning", value: money(e.contribution - e.commissioningYearContribution) },
                    ]}
                  />
                </Card>

                <Card title="Capital and payback">
                  <KeyValue
                    rows={[
                      { label: "Fleet acquisition", value: money(result.capital.fleetAcquisitionCost) },
                      { label: "Deployment / commissioning", value: money(result.capital.deployment.total) },
                      { label: "Deployment labor hours", value: `${number(result.capital.deployment.totalHours, 1)} hr` },
                      { label: "Customer implementation fee", value: money(result.contract.selected.upfrontCustomerFee) },
                      { label: "Net upfront operator capital", value: money(e.upfrontOperatorCapital) },
                      { label: "Payback", value: e.paybackYears === null ? "—" : `${number(e.paybackYears, 2)} seasons` },
                      { label: "Economic break-even", value: e.breakEvenDate ?? "—" },
                      { label: "Fleet residual value", value: money(result.capital.fleetResidualValue) },
                    ]}
                  />
                </Card>

                <Card title="Revenue and financing inputs">
                  <FieldGrid cols={1}>
                    <NumberField
                      label="Annual price override"
                      value={property.economics.annualPriceOverride}
                      onChange={(v) => update((d) => { d.economics.annualPriceOverride = v; })}
                      suffix="$/yr"
                      min={0}
                      help="0 uses the engine price from the Customer Value tab."
                    />
                    <NumberField
                      label="Implementation fee override"
                      value={property.economics.implementationFeeOverride}
                      onChange={(v) => update((d) => { d.economics.implementationFeeOverride = v; })}
                      suffix="$"
                      min={0}
                      help="0 uses the contract mechanism's upfront fee."
                    />
                    <NumberField
                      label="Other service revenue"
                      value={property.economics.otherServiceRevenue}
                      onChange={(v) => update((d) => { d.economics.otherServiceRevenue = v; })}
                      suffix="$/yr"
                      min={0}
                    />
                    <ToggleField
                      label="Finance / lease the fleet"
                      value={property.economics.financeEquipment}
                      onChange={(v) => update((d) => { d.economics.financeEquipment = v; })}
                      help="Removes machine cost from upfront capital and adds the financing spread to the P&L."
                    />
                    <TextAreaField
                      label="Notes"
                      value={property.economics.notes}
                      onChange={(v) => update((d) => { d.economics.notes = v; })}
                      rows={3}
                    />
                  </FieldGrid>
                </Card>

                <Card title="Deployment cost detail">
                  <KeyValue
                    rows={[
                      { label: "Site survey labor", value: money(result.capital.deployment.surveyLabor) },
                      { label: "Commissioning labor", value: money(result.capital.deployment.commissioningLabor) },
                      { label: "Zone mapping labor", value: money(result.capital.deployment.zoneMappingLabor) },
                      { label: "Crossing mapping labor", value: money(result.capital.deployment.crossingMappingLabor) },
                      { label: "Install materials", value: money(result.capital.deployment.installMaterials) },
                      { label: "Charging stations", value: money(result.capital.deployment.chargingStations) },
                      { label: "RTK base station", value: money(result.capital.deployment.rtkBaseStation) },
                      { label: "Mobilization", value: money(result.capital.deployment.mobilization) },
                      { label: "Total", value: money(result.capital.deployment.total) },
                    ]}
                  />
                </Card>
              </div>
            </div>
          </div>
        );
      }}
    </PropertyWorkspace>
  );
}
