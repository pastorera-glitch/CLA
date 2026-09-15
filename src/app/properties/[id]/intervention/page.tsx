"use client";

import { CATEGORY_COLORS, HBarChart, StackedBar } from "@/components/charts";
import { FieldGrid, FieldSection, NumberField, PercentField, ToggleField } from "@/components/fields";
import { PropertyWorkspace } from "@/components/property-page";
import { Bullets, Callout, Card, KeyValue, StatTile, Table, Td, Th } from "@/components/ui";
import { money, number } from "@/lib/format";
import { useStore } from "@/lib/store";
import { INTERVENTION_CATEGORIES, INTERVENTION_CATEGORY_LABELS } from "@/lib/types";

export default function InterventionPage() {
  const { assumptions } = useStore();
  const m = assumptions.interventionModel;

  return (
    <PropertyWorkspace
      title="Intervention / Human-in-the-Loop"
      subtitle="Expected human support burden. The readiness score drives the predicted rate through one visible formula — there is no black-box prediction here."
    >
      {({ property, result, update }) => {
        const v = property.intervention;
        const iv = result.intervention;
        const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) =>
          update((d) => {
            d.intervention[key] = value;
          });

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatTile
                label="Physical / machine / mo"
                value={number(iv.physicalPerMachineMonth, 2)}
                sub={iv.usingModel ? `Model predicted (x${number(iv.readinessMultiplier, 2)})` : "Manual entry"}
              />
              <StatTile label="Remote / machine / mo" value={number(iv.remotePerMachineMonth, 2)} sub="Stabilized" />
              <StatTile label="Site visits / yr" value={number(iv.stabilized.siteVisitsPerYear, 1)} sub="Whole fleet at this property" />
              <StatTile label="Field hours / yr" value={number(iv.stabilized.fieldHoursTotal, 1)} sub={`+ ${number(iv.stabilized.travelHoursTotal, 1)} hr travel`} />
              <StatTile label="Total human hours / yr" value={number(iv.stabilized.totalHumanHours, 0)} sub="Field + remote + travel" />
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <Card title="Rate model">
                  <ToggleField
                    label="Predict intervention rate from the readiness score"
                    value={v.useModelPredictedRate}
                    onChange={(x) => set("useModelPredictedRate", x)}
                    help="Turn this off once real field data exists for this site type, then enter observed rates below."
                  />
                  <div className="mt-3">
                    <Callout tone="accent" title="How the prediction works">
                      <code className="tnum">
                        rate = {number(m.baselinePhysicalPerMachineMonth, 2)} × (1 + {m.readinessSensitivity} × (
                        {m.referenceReadinessScore} − readiness) ÷ 25)
                      </code>
                      <br />
                      Readiness {Math.round(result.readiness.score)} against a reference of {m.referenceReadinessScore}{" "}
                      gives a multiplier of <strong className="tnum">×{number(iv.readinessMultiplier, 2)}</strong>, so the
                      predicted physical rate is{" "}
                      <strong className="tnum">{number(iv.modelPredictedPhysicalPerMachineMonth, 2)}</strong> per machine
                      per month (clamped to ×{m.minMultiplier}–×{m.maxMultiplier}). Baseline, reference, sensitivity and
                      the clamp are all editable in Assumptions.
                    </Callout>
                  </div>
                  <div className="mt-4">
                    <FieldGrid>
                      <NumberField
                        label="Unplanned physical / machine / month"
                        value={v.unplannedPhysicalPerMachineMonth}
                        onChange={(x) => set("unplannedPhysicalPerMachineMonth", x)}
                        min={0}
                        help={v.useModelPredictedRate ? "Ignored while the model is on." : "In use."}
                      />
                      <NumberField
                        label="Remote interventions / machine / month"
                        value={v.remotePerMachineMonth}
                        onChange={(x) => set("remotePerMachineMonth", x)}
                        min={0}
                        help={v.useModelPredictedRate ? "Ignored while the model is on." : "In use."}
                      />
                      <NumberField
                        label="Scheduled service visits / machine / yr"
                        value={v.scheduledVisitsPerMachineYear}
                        onChange={(x) => set("scheduledVisitsPerMachineYear", x)}
                        min={0}
                        help={`Blade interval forces at least ${number(iv.bladeChangesPerMachineYear, 1)}.`}
                      />
                    </FieldGrid>
                  </div>
                </Card>

                <Card title="Time and duty-cycle inputs">
                  <FieldSection title="Durations">
                    <FieldGrid>
                      <NumberField label="Avg physical intervention time" value={v.avgPhysicalInterventionHours} onChange={(x) => set("avgPhysicalInterventionHours", x)} suffix="hr" min={0} step={0.05} />
                      <NumberField label="Avg remote intervention time" value={v.avgRemoteInterventionHours} onChange={(x) => set("avgRemoteInterventionHours", x)} suffix="hr" min={0} step={0.05} />
                      <NumberField label="Avg scheduled visit time" value={v.avgScheduledVisitHours} onChange={(x) => set("avgScheduledVisitHours", x)} suffix="hr" min={0} step={0.05} />
                      <NumberField label="Avg travel time (one way)" value={v.avgTravelHours} onChange={(x) => set("avgTravelHours", x)} suffix="hr" min={0} step={0.05} help="Billed as a round trip." />
                      <NumberField label="Blade / service interval" value={v.bladeServiceIntervalHours} onChange={(x) => set("bladeServiceIntervalHours", x)} suffix="op hr" min={1} />
                    </FieldGrid>
                  </FieldSection>
                  <FieldSection title="Commissioning and availability">
                    <FieldGrid>
                      <NumberField label="Commissioning period" value={v.commissioningMonths} onChange={(x) => set("commissioningMonths", x)} suffix="mo" min={0} max={12} />
                      <NumberField label="Commissioning multiplier" value={v.commissioningMultiplier} onChange={(x) => set("commissioningMultiplier", x)} suffix="×" min={1} step={0.1} />
                      <PercentField label="Expected uptime" value={v.expectedUptimePct} onChange={(x) => set("expectedUptimePct", x)} min={50} />
                    </FieldGrid>
                  </FieldSection>
                </Card>

                <Card title="Intervention category mix" subtitle="Shares are normalized to 100%. Used to target where the interventions are actually coming from.">
                  <FieldGrid cols={3}>
                    {INTERVENTION_CATEGORIES.map((c) => (
                      <NumberField
                        key={c}
                        label={INTERVENTION_CATEGORY_LABELS[c]}
                        value={v.categoryMix[c]}
                        onChange={(x) =>
                          update((d) => {
                            d.intervention.categoryMix[c] = x;
                          })
                        }
                        suffix="%"
                        min={0}
                      />
                    ))}
                  </FieldGrid>
                  <div className="mt-4">
                    <StackedBar
                      segments={iv.categories.map((c, i) => ({
                        label: c.label,
                        value: c.sharePct,
                        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                      }))}
                    />
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                <Card title="Commissioning vs stabilized burden">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Measure</Th>
                        <Th align="right">Commissioning yr</Th>
                        <Th align="right">Stabilized</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Physical / machine / yr", iv.commissioningYear.physicalInterventionsPerMachineYear, iv.stabilized.physicalInterventionsPerMachineYear, 1],
                        ["Remote / machine / yr", iv.commissioningYear.remoteInterventionsPerMachineYear, iv.stabilized.remoteInterventionsPerMachineYear, 1],
                        ["Site visits / yr", iv.commissioningYear.siteVisitsPerYear, iv.stabilized.siteVisitsPerYear, 1],
                        ["Field hours / machine / yr", iv.commissioningYear.fieldHoursPerMachineYear, iv.stabilized.fieldHoursPerMachineYear, 1],
                        ["Field hours total", iv.commissioningYear.fieldHoursTotal, iv.stabilized.fieldHoursTotal, 1],
                        ["Remote hours total", iv.commissioningYear.remoteHoursTotal, iv.stabilized.remoteHoursTotal, 1],
                        ["Travel hours total", iv.commissioningYear.travelHoursTotal, iv.stabilized.travelHoursTotal, 1],
                        ["Total human hours", iv.commissioningYear.totalHumanHours, iv.stabilized.totalHumanHours, 0],
                      ].map(([label, c, s, dp]) => (
                        <tr key={label as string}>
                          <Td>{label as string}</Td>
                          <Td align="right" numeric>{number(c as number, dp as number)}</Td>
                          <Td align="right" numeric>{number(s as number, dp as number)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <div className="mt-3">
                    <KeyValue
                      rows={[
                        { label: "Commissioning-year labor cost", value: money(result.commissioningCost.lines.physicalInterventionLabor + result.commissioningCost.lines.remoteMonitoringLabor + result.commissioningCost.lines.travel) },
                        { label: "Stabilized labor cost", value: money(result.stabilizedCost.lines.physicalInterventionLabor + result.stabilizedCost.lines.remoteMonitoringLabor + result.stabilizedCost.lines.travel) },
                      ]}
                    />
                  </div>
                </Card>

                <Card title="Expected interventions by category" subtitle="Per machine per year, stabilized.">
                  <HBarChart
                    rows={iv.categories.map((c) => ({
                      label: c.label,
                      value: c.physicalPerMachineYear,
                    }))}
                    formatValue={(x) => number(x, 1)}
                  />
                </Card>

                <Card title="Model notes">
                  <Bullets items={iv.notes} />
                </Card>
              </div>
            </div>
          </div>
        );
      }}
    </PropertyWorkspace>
  );
}
