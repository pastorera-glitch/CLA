"use client";

import { FieldGrid, FieldSection, NumberField, RatingField, SelectField, TextAreaField } from "@/components/fields";
import { PropertyWorkspace } from "@/components/property-page";
import { Badge, Bullets, Callout, Card, KeyValue, StatTile, Table, Td, Th } from "@/components/ui";
import { money, pct } from "@/lib/format";
import type { PricingApproach } from "@/lib/types";
import { PRICING_APPROACHES, PRICING_APPROACH_LABELS } from "@/lib/types";

export default function CustomerValuePage() {
  return (
    <PropertyWorkspace
      title="Customer Value Analysis"
      subtitle="Current state against the proposed robotic service, with four pricing approaches priced side by side. The model does not assume a customer needs a discount."
    >
      {({ property, result, update }) => {
        const cv = property.customerValue;
        const v = result.value;
        const set = <K extends keyof typeof cv>(key: K, value: (typeof cv)[K]) =>
          update((d) => {
            d.customerValue[key] = value;
          });

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatTile label="Quoted annual price" value={money(v.recommendedAnnualPrice)} sub={sourceLabel(v.priceSource)} />
              <StatTile label="Cost floor" value={money(v.requiredFloorPrice)} sub="At the target contribution margin" />
              <StatTile
                label="Customer savings"
                value={money(v.annualCustomerSavings)}
                tone={v.annualCustomerSavings >= 0 ? "good" : "bad"}
                sub={pct(v.savingsPct)}
              />
              <StatTile label="Cost per autonomous acre" value={money(v.costPerAutonomousAcre)} sub={`Incumbent ${money(v.incumbentCostPerAcre)}`} />
              <StatTile label="Replaced incumbent spend" value={money(v.replacedIncumbentSpend)} sub={`of ${money(v.incumbentMowingOnlyCost)} mowing-only`} />
            </div>

            {v.warnings.length > 0 && (
              <Card title="Pricing warnings">
                <Bullets items={v.warnings} tone="warn" />
              </Card>
            )}

            <div className="grid items-start gap-4 lg:grid-cols-2">
              <Card title="Current state" subtitle="What the customer buys today.">
                <KeyValue rows={v.currentState.map((x) => ({ label: x.label, value: x.value }))} />
              </Card>
              <Card title="Proposed robotic state" subtitle="What changes under a resident-robot service.">
                <KeyValue rows={v.proposedState.map((x) => ({ label: x.label, value: x.value }))} />
              </Card>
            </div>

            <Card title="Pricing approaches" subtitle="Each approach is priced against the replaced incumbent spend, then tested against the cost floor." dense>
              <Table>
                <thead>
                  <tr>
                    <Th>Approach</Th>
                    <Th align="right">Target savings</Th>
                    <Th align="right">Annual price</Th>
                    <Th align="right">Customer savings</Th>
                    <Th align="right">Margin at this price</Th>
                    <Th>Status</Th>
                    <Th align="right">Select</Th>
                  </tr>
                </thead>
                <tbody>
                  {v.approaches.map((a) => (
                    <tr key={a.approach} className={a.approach === cv.pricingApproach ? "bg-accent-50" : ""}>
                      <Td className="font-medium text-ink-900">{a.label}</Td>
                      <Td align="right" numeric>{pct(a.targetSavingsPct)}</Td>
                      <Td align="right" numeric>{money(a.annualPrice)}</Td>
                      <Td align="right" numeric className={a.customerSavings >= 0 ? "text-good-700" : "text-bad-500"}>
                        {money(a.customerSavings)}
                      </Td>
                      <Td align="right" numeric>{pct(a.marginAtThisPrice)}</Td>
                      <Td>
                        {a.belowFloor ? <Badge tone="bad">Below cost floor</Badge> : <Badge tone="good">Clears floor</Badge>}
                      </Td>
                      <Td align="right">
                        <button
                          type="button"
                          className="text-[11.5px] font-semibold text-accent-700 hover:underline"
                          onClick={() => set("pricingApproach", a.approach)}
                        >
                          {a.approach === cv.pricingApproach ? "Selected" : "Use"}
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <Card title="Inputs">
                <FieldSection title="Current state">
                  <FieldGrid>
                    <NumberField
                      label="Annual mowing-only cost override"
                      value={cv.annualMowingOnlyCostOverride}
                      onChange={(x) => set("annualMowingOnlyCostOverride", x)}
                      suffix="$/yr"
                      min={0}
                      help={`0 uses the intake figure of ${money(property.intake.estimatedMowingOnlyCost)}.`}
                    />
                    <NumberField label="Cuts per month (in season)" value={cv.currentCutsPerMonth} onChange={(x) => set("currentCutsPerMonth", x)} min={0} step={0.5} />
                    <NumberField label="Fuel burned per year" value={cv.currentFuelGallonsPerYear} onChange={(x) => set("currentFuelGallonsPerYear", x)} suffix="gal" min={0} />
                  </FieldGrid>
                  <div className="mt-3">
                    <FieldGrid>
                      <RatingField label="Crew visibility today" help="How noticeable the mowing crew is on site." low="Barely noticed" high="A recurring problem" value={cv.currentCrewVisibilityRating} onChange={(x) => set("currentCrewVisibilityRating", x)} />
                      <RatingField label="Service complaints today" low="None" high="Frequent" value={cv.currentComplaintsRating} onChange={(x) => set("currentComplaintsRating", x)} />
                      <RatingField label="Noise today" low="Not an issue" high="Significant issue" value={cv.currentNoiseRating} onChange={(x) => set("currentNoiseRating", x)} />
                      <RatingField label="Vendor-management burden" low="Minimal" high="Heavy" value={cv.vendorManagementBurdenRating} onChange={(x) => set("vendorManagementBurdenRating", x)} />
                    </FieldGrid>
                  </div>
                </FieldSection>

                <FieldSection title="Proposed robotic state">
                  <FieldGrid>
                    <NumberField label="Autonomous cuts per week" value={cv.proposedCutsPerWeek} onChange={(x) => set("proposedCutsPerWeek", x)} min={0} step={0.5} />
                    <RatingField label="Expected appearance consistency" low="Inconsistent" high="Highly consistent" value={cv.expectedAppearanceConsistencyRating} onChange={(x) => set("expectedAppearanceConsistencyRating", x)} />
                  </FieldGrid>
                </FieldSection>

                <FieldSection title="Pricing">
                  <FieldGrid>
                    <SelectField<PricingApproach>
                      label="Pricing approach"
                      value={cv.pricingApproach}
                      onChange={(x) => set("pricingApproach", x)}
                      options={PRICING_APPROACHES.map((a) => ({ value: a, label: PRICING_APPROACH_LABELS[a] }))}
                    />
                    <NumberField
                      label="Custom target savings"
                      value={cv.customTargetSavingsPct}
                      onChange={(x) => set("customTargetSavingsPct", x)}
                      suffix="%"
                      help="Used with the Custom approach. Negative means a premium over incumbent."
                    />
                    <NumberField
                      label="Annual price override"
                      value={property.economics.annualPriceOverride}
                      onChange={(x) => update((d) => { d.economics.annualPriceOverride = x; })}
                      suffix="$/yr"
                      min={0}
                      help="0 uses the engine price."
                    />
                  </FieldGrid>
                  <div className="mt-3">
                    <FieldGrid cols={1}>
                      <TextAreaField label="Qualitative notes" value={cv.qualitativeNotes} onChange={(x) => set("qualitativeNotes", x)} rows={3} />
                    </FieldGrid>
                  </div>
                </FieldSection>
              </Card>

              <div className="space-y-4">
                <Card title="Qualitative operational benefits">
                  <Bullets items={v.qualitativeBenefits} tone="good" />
                </Card>
                <Card title="Unit economics for the customer">
                  <KeyValue
                    rows={[
                      { label: "Incumbent cost per visit", value: money(v.incumbentCostPerVisit) },
                      { label: "Incumbent cost per turf acre", value: money(v.incumbentCostPerAcre) },
                      { label: "Our cost per autonomous acre", value: money(v.costPerAutonomousAcre) },
                      { label: "Our cost per season", value: money(v.costPerSeason) },
                      { label: "Implied premium vs replaced spend", value: pct(v.impliedPremiumPct) },
                      { label: "Mowing scope still bought elsewhere", value: money(v.retainedIncumbentSpend) },
                    ]}
                  />
                </Card>
                <Callout tone="neutral" title="Reading the savings figure">
                  Savings are measured against the portion of the incumbent mowing scope robotics actually replaces, not
                  against the whole landscaping contract. A customer keeping a crew for trimming will not see the headline
                  number on their total spend.
                </Callout>
              </div>
            </div>
          </div>
        );
      }}
    </PropertyWorkspace>
  );
}

function sourceLabel(source: "override" | "value_approach" | "cost_floor"): string {
  if (source === "override") return "Manual override";
  if (source === "cost_floor") return "Raised to the cost floor";
  return "From the selected pricing approach";
}
