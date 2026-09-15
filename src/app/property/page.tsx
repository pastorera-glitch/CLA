"use client";

import { ClusterBadge, DecisionBadge, VerdictBadge } from "@/components/decision";
import { PropertyWorkspace } from "@/components/property-page";
import { SelectField } from "@/components/fields";
import {
  Badge,
  Bullets,
  Button,
  Callout,
  Card,
  KeyValue,
  ScoreBar,
  ScoreDial,
  StatTile,
  scoreTone,
} from "@/components/ui";
import { acres, dateLabel, money, number, pct } from "@/lib/format";
import { useStore } from "@/lib/store";
import { DECISION_STATUS_LABELS, PROPERTY_TYPE_LABELS, type DecisionStatus } from "@/lib/types";
import { propertyHref } from "@/lib/routes";

export default function PropertyOverviewPage() {
  const { assumptions } = useStore();

  return (
    <PropertyWorkspace
      title="Underwriting Summary"
      subtitle="Everything below is computed by the calculation engine from the inputs on the other tabs."
    >
      {({ property, result, update }) => {
        const r = result.recommendation;
        const e = result.economics;
        const eq = result.equipment;

        return (
          <div className="space-y-4">
            <Card
              title="Site recommendation"
              actions={
                <>
                  <VerdictBadge verdict={e.underwritingVerdict} />
                  <DecisionBadge decision={r.decision} overridden={r.decisionIsOverridden} />
                </>
              }
            >
              <div className="grid gap-5 lg:grid-cols-[auto_auto_auto_minmax(0,1fr)]">
                <ScoreDial score={result.readiness.score} caption="Robot Readiness" />
                <ScoreDial score={r.opportunityScore} caption="Opportunity" />
                <ScoreDial score={result.cluster.score} caption="Cluster" />
                <div className="min-w-0">
                  <Bullets items={r.decisionRationale} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone={scoreTone(result.readiness.score)}>{result.readiness.bandLabel}</Badge>
                    <ClusterBadge classification={result.cluster.classification} />
                    <Badge>{PROPERTY_TYPE_LABELS[property.intake.propertyType]}</Badge>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              <StatTile label="Autonomous acres" value={number(eq.autonomousAcres, 2)} sub={`of ${acres(property.assessment.geometry.totalTurfAcres)}`} href={propertyHref(property.id, "assessment")} />
              <StatTile label="Machines" value={`${eq.liveMachines} + ${eq.spareMachines}`} sub="Live + spare" href={propertyHref(property.id, "equipment")} />
              <StatTile label="Annual price" value={money(result.value.recommendedAnnualPrice)} sub={`${pct(result.value.savingsPct)} vs replaced spend`} href={propertyHref(property.id, "value")} />
              <StatTile label="Contribution" value={money(e.contribution)} sub={pct(e.contributionMarginPct)} href={propertyHref(property.id, "economics")} />
              <StatTile label="Capital required" value={money(e.upfrontOperatorCapital)} sub={e.paybackYears === null ? "No payback" : `${number(e.paybackYears, 2)} yr payback`} href={propertyHref(property.id, "economics")} />
              <StatTile label="Human hours / yr" value={number(result.intervention.stabilized.totalHumanHours, 0)} sub={`${number(result.intervention.stabilized.siteVisitsPerYear, 1)} site visits`} href={propertyHref(property.id, "intervention")} />
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-2">
              <Card title="Why this site works">
                <Bullets items={r.whyThisSiteWorks} tone="good" />
              </Card>
              <Card title="What could break the model">
                <Bullets items={r.whatCouldBreakTheModel} tone="bad" />
              </Card>
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-3">
              <Card title="Readiness categories" className="lg:col-span-2">
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {result.readiness.categories.map((c) => (
                    <ScoreBar
                      key={c.category}
                      score={c.score}
                      label={`${c.label} · ${number(c.weight, 0)}%`}
                      right={`${Math.round(c.score)}`}
                    />
                  ))}
                </div>
              </Card>

              <Card title="Opportunity components">
                <div className="space-y-3">
                  {r.opportunityComponents.map((c) => (
                    <div key={c.label}>
                      <ScoreBar score={c.score} label={`${c.label} · ${Math.round(c.weight * 100)}%`} right={Math.round(c.score)} />
                      <p className="mt-0.5 text-[11px] leading-snug text-ink-400">{c.detail}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-3">
              <Card title="Deal summary">
                <KeyValue
                  rows={[
                    { label: "Recommended equipment", value: eq.recommended ? `${eq.recommended.product.manufacturer} ${eq.recommended.product.model}` : "—" },
                    { label: "Machine count", value: `${eq.liveMachines} live + ${eq.spareMachines} spare` },
                    { label: "Estimated autonomous acreage", value: acres(eq.autonomousAcres) },
                    { label: "Expected intervention rate", value: `${number(result.intervention.physicalPerMachineMonth, 2)} / machine / mo` },
                    { label: "Expected human hours", value: `${number(result.intervention.stabilized.totalHumanHours, 0)} / yr` },
                    { label: "Customer price", value: money(result.value.recommendedAnnualPrice) },
                    { label: "Customer savings", value: `${money(result.value.annualCustomerSavings)} (${pct(result.value.savingsPct)})` },
                    { label: "Contribution margin", value: pct(e.contributionMarginPct) },
                    { label: "Capital required", value: money(e.upfrontOperatorCapital) },
                    { label: "Recommended contract", value: `${result.contract.selected.structureLabel} · ${result.contract.selected.mechanismLabel.split("—")[0].trim()}` },
                  ]}
                />
              </Card>

              <Card title="Major risks">
                <Bullets items={r.majorRisks.slice(0, 8)} tone="warn" />
              </Card>

              <Card title="Required follow-up diligence">
                <Bullets items={r.requiredDiligence.slice(0, 8)} />
              </Card>
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-3">
              <Card title="Property record" className="lg:col-span-2">
                <KeyValue
                  rows={[
                    { label: "Owner", value: property.intake.owner || "—" },
                    { label: "Property manager", value: property.intake.propertyManager || "—" },
                    { label: "Existing landscaper", value: property.intake.existingLandscaper || "—" },
                    { label: "Parcel acreage", value: acres(property.intake.parcelAcres) },
                    { label: "Turf acreage", value: acres(property.assessment.geometry.totalTurfAcres) },
                    { label: "Annual landscaping spend", value: money(property.intake.existingAnnualLandscapeCost) },
                    { label: "Mowing-only spend", value: money(property.intake.estimatedMowingOnlyCost) },
                    { label: "Annual mowing visits", value: property.intake.annualMowingVisits },
                    { label: "Incumbent termination", value: property.intake.terminationProvision.replace(/_/g, " ") },
                    { label: "Incumbent expiration", value: property.intake.contractExpiration || "Unknown" },
                    { label: "Created", value: dateLabel(property.createdAt) },
                    { label: "Last updated", value: dateLabel(property.updatedAt) },
                  ]}
                />
              </Card>

              <Card title="Decision override" subtitle="The engine's decision stands unless an underwriter overrides it here.">
                <SelectField
                  label="Decision"
                  value={property.decisionOverride ?? ""}
                  onChange={(v) =>
                    update((d) => {
                      d.decisionOverride = v === "" ? null : (v as DecisionStatus);
                    })
                  }
                  options={[
                    { value: "", label: `Use engine decision (${DECISION_STATUS_LABELS[r.decisionIsOverridden ? r.decision : r.decision]})` },
                    ...Object.entries(DECISION_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v })),
                  ]}
                />
                {r.decisionIsOverridden && (
                  <div className="mt-3">
                    <Callout tone="warn" title="Manual override active">
                      The recorded decision is not the engine&apos;s. The rationale should be written into the property
                      notes so the file stands on its own at review.
                    </Callout>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button href={propertyHref(property.id, "report")} variant="primary">
                    Open full report
                  </Button>
                  <Button href={propertyHref(property.id, "assessment")}>Edit assessment</Button>
                </div>
                <p className="mt-3 text-[11.5px] leading-snug text-ink-500">
                  Underwriting thresholds in force: target {assumptions.thresholds.targetContributionMarginPct}%,
                  conditional {assumptions.thresholds.conditionalContributionMarginPct}%, payback{" "}
                  {assumptions.thresholds.targetPaybackYears} yr.
                </p>
              </Card>
            </div>
          </div>
        );
      }}
    </PropertyWorkspace>
  );
}
