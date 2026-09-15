"use client";

import { ComparisonBars } from "@/components/charts";
import { FieldGrid, NumberField, SelectField, TextAreaField } from "@/components/fields";
import { PropertyWorkspace } from "@/components/property-page";
import { Badge, Bullets, Callout, Card, KeyValue, StatTile, Table, Td, Th } from "@/components/ui";
import { money, number, pct } from "@/lib/format";
import type { ContractStructure, PricingMechanism } from "@/lib/types";
import {
  CONTRACT_STRUCTURES,
  CONTRACT_STRUCTURE_LABELS,
  PRICING_MECHANISMS,
  PRICING_MECHANISM_LABELS,
} from "@/lib/types";

export default function ContractPage() {
  return (
    <PropertyWorkspace
      title="Contract Duration & Capital-Risk Pricing"
      subtitle="Robotic deployment requires capital before the first invoice. A 30-day terminable contract does not become safe by ignoring that — it becomes more expensive."
    >
      {({ property, result, update }) => {
        const c = property.contract;
        const sel = result.contract.selected;
        const set = <K extends keyof typeof c>(key: K, value: (typeof c)[K]) =>
          update((d) => {
            d.contract[key] = value;
          });

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatTile label="Committed seasons" value={number(sel.committedSeasons, 2)} sub={sel.structureLabel} />
              <StatTile label="Upfront customer fee" value={money(sel.upfrontCustomerFee)} sub={sel.mechanism === "A_upfront_deployment_fee" ? `${c.upfrontDeploymentFeeCoveragePct}% of deployment` : "None under this mechanism"} />
              <StatTile label="Required recurring price" value={money(sel.requiredAnnualRecurringPrice)} sub="At the target contribution margin" />
              <StatTile label="Flexibility premium" value={money(sel.contractFlexibilityPremiumAnnual)} sub={`${sel.terminationProbabilityPct}% termination probability`} />
              <StatTile
                label="Capital at risk on termination"
                value={money(sel.expectedUnrecoveredCapital)}
                tone="warn"
                sub="Unamortized deployment + redeployment + idle carry"
              />
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
                <Card
                  title="Required annualized price by contract structure"
                  subtitle={`Priced under mechanism ${sel.mechanismLabel}. Shorter commitments carry more unrecovered capital, so they cost more.`}
                >
                  <ComparisonBars
                    rows={result.contract.structureComparison.map((o) => ({
                      key: o.structure,
                      label: o.structureLabel,
                      value: o.requiredTotalAnnualizedPrice,
                      sublabel: `${number(o.committedSeasons, 2)} seasons`,
                    }))}
                    highlightKey={sel.structure}
                  />
                  <div className="mt-4">
                    <Bullets items={result.contract.commentary} />
                  </div>
                </Card>

                <Card title="Structure comparison" dense>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Structure</Th>
                        <Th align="right">Seasons</Th>
                        <Th align="right">Deployment recovery</Th>
                        <Th align="right">Equipment recovery</Th>
                        <Th align="right">Term. prob.</Th>
                        <Th align="right">Unrecovered capital</Th>
                        <Th align="right">Flex premium</Th>
                        <Th align="right">Upfront</Th>
                        <Th align="right">Recurring</Th>
                        <Th align="right">Annualized</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.contract.structureComparison.map((o) => (
                        <tr key={o.structure} className={o.structure === sel.structure ? "bg-accent-50" : ""}>
                          <Td className="font-medium text-ink-900">{o.structureLabel}</Td>
                          <Td align="right" numeric>{number(o.committedSeasons, 2)}</Td>
                          <Td align="right" numeric>{money(o.deploymentRecoveryAnnual)}</Td>
                          <Td align="right" numeric>{money(o.equipmentCapitalRecoveryAnnual)}</Td>
                          <Td align="right" numeric>{pct(o.terminationProbabilityPct, 0)}</Td>
                          <Td align="right" numeric>{money(o.expectedUnrecoveredCapital)}</Td>
                          <Td align="right" numeric>{money(o.contractFlexibilityPremiumAnnual)}</Td>
                          <Td align="right" numeric>{money(o.upfrontCustomerFee)}</Td>
                          <Td align="right" numeric>{money(o.requiredAnnualRecurringPrice)}</Td>
                          <Td align="right" numeric className="font-semibold">{money(o.requiredTotalAnnualizedPrice)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card>

                <Card
                  title="Capital-risk recovery mechanisms"
                  subtitle={`Priced under a ${sel.structureLabel.toLowerCase()}. None is hardcoded as correct — they differ in where money is collected and who carries termination risk.`}
                  dense
                >
                  <Table>
                    <thead>
                      <tr>
                        <Th>Mechanism</Th>
                        <Th align="right">Upfront fee</Th>
                        <Th align="right">Recurring</Th>
                        <Th align="right">Early-term charge</Th>
                        <Th align="right">Flex premium</Th>
                        <Th align="right">Deploy. recovery</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.contract.mechanismComparison.map((o) => (
                        <tr key={o.mechanism} className={o.mechanism === sel.mechanism ? "bg-accent-50" : ""}>
                          <Td className="max-w-[300px]">
                            <div className="font-medium text-ink-900">{o.mechanismLabel}</div>
                            <div className="mt-0.5 text-[11px] leading-snug text-ink-500">{o.notes[0]}</div>
                          </Td>
                          <Td align="right" numeric>{money(o.upfrontCustomerFee)}</Td>
                          <Td align="right" numeric>{money(o.requiredAnnualRecurringPrice)}</Td>
                          <Td align="right" numeric>{o.earlyTerminationCharge > 0 ? money(o.earlyTerminationCharge) : "—"}</Td>
                          <Td align="right" numeric>{money(o.contractFlexibilityPremiumAnnual)}</Td>
                          <Td align="right" numeric>{number(o.deploymentRecoveryYears, 2)} yr</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card>
              </div>

              <div className="space-y-4">
                <Card title="Structure selection">
                  <FieldGrid cols={1}>
                    <SelectField<ContractStructure>
                      label="Contract structure"
                      value={c.structure}
                      onChange={(v) => set("structure", v)}
                      options={CONTRACT_STRUCTURES.map((s) => ({ value: s, label: CONTRACT_STRUCTURE_LABELS[s] }))}
                    />
                    {c.structure === "custom" && (
                      <NumberField label="Custom term" value={c.customSeasons} onChange={(v) => set("customSeasons", v)} suffix="seasons" min={0.25} step={0.25} />
                    )}
                    <SelectField<PricingMechanism>
                      label="Capital-risk mechanism"
                      value={c.mechanism}
                      onChange={(v) => set("mechanism", v)}
                      options={PRICING_MECHANISMS.map((m) => ({ value: m, label: PRICING_MECHANISM_LABELS[m] }))}
                    />
                    {c.mechanism === "A_upfront_deployment_fee" && (
                      <NumberField
                        label="Upfront deployment fee coverage"
                        value={c.upfrontDeploymentFeeCoveragePct}
                        onChange={(v) => set("upfrontDeploymentFeeCoveragePct", v)}
                        suffix="%"
                        min={0}
                        max={100}
                      />
                    )}
                    <NumberField
                      label="Termination probability override"
                      value={c.terminationProbabilityOverridePct}
                      onChange={(v) => set("terminationProbabilityOverridePct", v)}
                      suffix="%"
                      min={-1}
                      max={100}
                      help="-1 uses the modeled probability for the selected structure."
                    />
                    <TextAreaField label="Notes" value={c.notes} onChange={(v) => set("notes", v)} rows={3} />
                  </FieldGrid>
                </Card>

                <Card title="Termination exposure" subtitle="Modeled at the midpoint of the committed term.">
                  <KeyValue
                    rows={[
                      { label: "Total deployment cost", value: money(result.capital.deployment.total) },
                      { label: "Unamortized deployment", value: money(sel.unamortizedDeploymentAtTermination) },
                      { label: "Redeployment cost", value: money(sel.redeploymentCost) },
                      { label: "Idle carrying cost", value: money(sel.idleCarryingCost) },
                      { label: "Expected unrecovered capital", value: money(sel.expectedUnrecoveredCapital) },
                      { label: "Residual machine value retained", value: money(sel.residualMachineValueAtTermination) },
                      { label: "Early-termination charge", value: sel.earlyTerminationCharge > 0 ? money(sel.earlyTerminationCharge) : "None" },
                    ]}
                  />
                  <div className="mt-3">
                    <Callout tone="neutral">
                      Machines are redeployable, so their residual value is not a loss. What is lost is the deployment
                      labor sunk into this specific site, the cost of pulling and re-commissioning the fleet elsewhere,
                      and the capital charge while it sits idle.
                    </Callout>
                  </div>
                </Card>

                <Card title="Selected mechanism">
                  <Badge tone="accent">{sel.mechanismLabel}</Badge>
                  <div className="mt-2">
                    <Bullets items={sel.notes} />
                  </div>
                </Card>

                <Card title="Incumbent contract context">
                  <KeyValue
                    rows={[
                      { label: "Incumbent termination", value: property.intake.terminationProvision.replace(/_/g, " ") },
                      { label: "Incumbent expiration", value: property.intake.contractExpiration || "Unknown" },
                    ]}
                  />
                  <p className="mt-2 text-[11.5px] leading-snug text-ink-500">
                    If the incumbent works on 30 days&apos; notice, the customer will expect the same from us. That is
                    exactly the case where an upfront implementation fee or an unamortized-deployment charge does the work
                    a long term would otherwise do.
                  </p>
                </Card>
              </div>
            </div>
          </div>
        );
      }}
    </PropertyWorkspace>
  );
}
