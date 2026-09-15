"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/app-shell";
import { ClusterBadge, DecisionBadge, VerdictBadge } from "@/components/decision";
import { PropertyNav } from "@/components/property-nav";
import { WorkspaceLoading } from "@/components/property-page";
import {
  Badge,
  Bullets,
  Button,
  Callout,
  Card,
  EmptyState,
  KeyValue,
  ScoreDial,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { acres, dateLabel, money, number, pct, titleCase } from "@/lib/format";
import { useStore, useUnderwriting } from "@/lib/store";
import {
  LANDSCAPER_ROLE_LABELS,
  PROPERTY_TYPE_LABELS,
  RESIDUAL_OWNER_LABELS,
  RESIDUAL_SERVICE_LABELS,
  TERMINATION_PROVISION_LABELS,
} from "@/lib/types";
import { RATING_SCALES } from "@/lib/defaults";
import { propertyHref } from "@/lib/routes";

export default function ReportPage() {
  // useSearchParams needs a Suspense boundary for the static export to prerender.
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <ReportPageInner />
    </Suspense>
  );
}

function ReportPageInner() {
  const id = useSearchParams().get("id") ?? "";
  const { ready, getProperty, assumptions } = useStore();
  const property = getProperty(id);
  const result = useUnderwriting(property);

  if (!ready) return <WorkspaceLoading />;
  if (!property || !result) {
    return (
      <EmptyState title="Property not found">
        <Button href="/properties" variant="primary">
          Back to properties
        </Button>
      </EmptyState>
    );
  }

  const r = result.recommendation;
  const e = result.economics;
  const eq = result.equipment;
  const g = property.assessment.geometry;

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Site Evaluation Report"
          subtitle={`${property.intake.name || "Untitled property"} — printable underwriting summary.`}
          actions={
            <>
              <Button href={propertyHref(id)}>Back to summary</Button>
              <Button variant="primary" onClick={() => window.print()}>
                Print / Save as PDF
              </Button>
            </>
          }
        />
        <PropertyNav id={id} />
      </div>

      <article className="space-y-4 bg-white p-5 print:p-0">
        {/* Header */}
        <header className="border-b-2 border-ink-900 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="label-caps">TurfOps · Commercial Robotic Mowing Underwriting</div>
              <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-tight text-ink-900">
                {property.intake.name || "Untitled property"}
              </h1>
              <p className="mt-0.5 text-[13px] text-ink-600">
                {[property.intake.addressLine1, property.intake.city, property.intake.state, property.intake.postalCode]
                  .filter(Boolean)
                  .join(", ") || "No address entered"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>{PROPERTY_TYPE_LABELS[property.intake.propertyType]}</Badge>
                <DecisionBadge decision={r.decision} overridden={r.decisionIsOverridden} />
                <VerdictBadge verdict={e.underwritingVerdict} />
                <ClusterBadge classification={result.cluster.classification} />
              </div>
            </div>
            <div className="flex gap-4">
              <ScoreDial score={result.readiness.score} caption="Robot Readiness" size={88} />
              <ScoreDial score={r.opportunityScore} caption="Opportunity" size={88} />
              <ScoreDial score={result.cluster.score} caption="Cluster" size={88} />
            </div>
          </div>
          <p className="mt-3 text-[11px] text-ink-500">
            Report generated {dateLabel(new Date().toISOString())} · Property last updated {dateLabel(property.updatedAt)}{" "}
            · All equipment specifications and operating assumptions in this report are unverified placeholders.
          </p>
        </header>

        <Section n={1} title="Property overview">
          <div className="grid items-start gap-x-8 gap-y-0 sm:grid-cols-2">
            <KeyValue
              rows={[
                { label: "Owner", value: property.intake.owner || "—" },
                { label: "Property manager", value: property.intake.propertyManager || "—" },
                { label: "Existing landscaper", value: property.intake.existingLandscaper || "—" },
                { label: "Total parcel acreage", value: acres(property.intake.parcelAcres) },
                { label: "Estimated turf acreage", value: acres(property.intake.estimatedTurfAcres) },
                { label: "Existing annual landscaping cost", value: money(property.intake.existingAnnualLandscapeCost) },
              ]}
            />
            <KeyValue
              rows={[
                { label: "Estimated mowing-only cost", value: money(property.intake.estimatedMowingOnlyCost) },
                { label: "Annual mowing visits", value: property.intake.annualMowingVisits },
                { label: "Incumbent cost per visit", value: money(result.value.incumbentCostPerVisit) },
                { label: "Incumbent cost per turf acre", value: money(result.value.incumbentCostPerAcre) },
                { label: "Termination provision", value: TERMINATION_PROVISION_LABELS[property.intake.terminationProvision] },
                { label: "Contract expiration", value: property.intake.contractExpiration || "Unknown" },
              ]}
            />
          </div>
          {property.intake.notes && (
            <p className="mt-3 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-700">{property.intake.notes}</p>
          )}
        </Section>

        <Section n={2} title="Site characteristics">
          <div className="grid items-start gap-x-8 gap-y-0 sm:grid-cols-2">
            <KeyValue
              rows={[
                { label: "Total turf acreage", value: acres(g.totalTurfAcres) },
                { label: "Contiguous turf acreage", value: acres(g.contiguousTurfAcres) },
                { label: "Separate mowing zones", value: g.mowingZoneCount },
                { label: "Largest contiguous zone", value: acres(g.largestZoneAcres) },
                { label: "Average zone size", value: acres(g.averageZoneAcres) },
                { label: "Autonomous-compatible turf", value: pct(g.autonomousCompatiblePct, 0) },
                { label: "Turf perimeter", value: `${number(g.turfPerimeterLinearFeet, 0)} lf` },
                { label: "Max sustained slope", value: `${g.maxSlopePct}%` },
              ]}
            />
            <KeyValue
              rows={[
                { label: "Road crossings", value: g.roadCrossings },
                { label: "Sidewalk crossings", value: g.sidewalkCrossings },
                { label: "Gates / narrow passages", value: `${g.gates} / ${g.narrowPassages}` },
                { label: "Curbs", value: `${number(g.curbLinearFeet, 0)} lf` },
                { label: "Retaining walls / beds", value: `${g.retainingWalls} / ${g.landscapeBeds}` },
                { label: "Trees / light poles / signage", value: `${g.trees} / ${g.lightPoles} / ${g.signage}` },
                { label: "Drainage structures / water hazards", value: `${g.drainageStructures} / ${g.waterHazards}` },
                { label: "Steep slope / irregular areas", value: `${g.steepSlopeAreas} / ${g.irregularTurfAreas}` },
              ]}
            />
          </div>
          <h3 className="label-caps mt-4 mb-2">Qualitative ratings (5 = most favorable for autonomy)</h3>
          <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(RATING_SCALES) as Array<keyof typeof property.assessment.ratings>).map((key) => (
              <div key={key} className="flex items-baseline justify-between gap-3 border-b border-ink-100 py-1">
                <span className="text-[12px] text-ink-600">{RATING_SCALES[key].label}</span>
                <span className="tnum text-[12px] font-semibold text-ink-900">{property.assessment.ratings[key]}/5</span>
              </div>
            ))}
          </div>
          {property.assessment.assessorNotes && (
            <p className="mt-3 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-700">
              {property.assessment.assessorNotes}
            </p>
          )}
        </Section>

        <Section n={3} title="Robot-readiness scoring">
          <p className="mb-3 text-[12.5px] text-ink-700">
            Weighted score of <strong className="tnum">{number(result.readiness.score, 1)}</strong> / 100 —{" "}
            {result.readiness.bandLabel}. Bands: {assumptions.readinessBands.strongMin}+ strong,{" "}
            {assumptions.readinessBands.candidateMin}–{assumptions.readinessBands.strongMin - 1} candidate,{" "}
            {assumptions.readinessBands.conditionalMin}–{assumptions.readinessBands.candidateMin - 1} conditional, below{" "}
            {assumptions.readinessBands.conditionalMin} poor.
          </p>
          <Table>
            <thead>
              <tr>
                <Th>Category</Th>
                <Th align="right">Weight</Th>
                <Th align="right">Score</Th>
                <Th align="right">Contribution</Th>
                <Th align="right">Points lost</Th>
                <Th>Basis</Th>
              </tr>
            </thead>
            <tbody>
              {result.readiness.categories.map((c) => (
                <tr key={c.category}>
                  <Td className="font-medium text-ink-900">{c.label}</Td>
                  <Td align="right" numeric>{number(c.weight, 0)}%</Td>
                  <Td align="right" numeric>{Math.round(c.score)}</Td>
                  <Td align="right" numeric>{number(c.contribution, 1)}</Td>
                  <Td align="right" numeric className="text-bad-500">−{number(c.pointsLost, 1)}</Td>
                  <Td className="text-[11.5px] text-ink-500">{c.detail}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <h3 className="label-caps mt-4 mb-2">Flags reducing the score</h3>
          <Bullets items={result.readiness.flags.map((f) => `[${f.severity}] ${f.message}`)} tone="warn" />
        </Section>

        <Section n={4} title="Aerial / site measurement">
          <Callout tone="neutral" title="Placeholder — integration not yet built">
            <p>
              Measurement source: <strong>{titleCase(property.intake.gis.measurementSource)}</strong>
              {property.intake.gis.parcelId ? ` · Parcel ID ${property.intake.gis.parcelId}` : ""}
              {property.intake.gis.aerialImageUrl ? ` · Imagery reference on file` : ""}.
            </p>
            <p className="mt-1.5">
              Turf polygons, obstacle inventory and slope modeling are entered manually in this build. GIS, parcel data,
              aerial imagery and automated measurement are Phase 2. Every acreage figure in this report carries the
              uncertainty of a manual estimate, and the autonomous-compatible percentage is the single most important
              number to verify on site.
            </p>
          </Callout>
        </Section>

        <Section n={5} title="Equipment recommendation">
          {eq.recommended ? (
            <>
              <div className="mb-3 flex flex-wrap items-baseline gap-2">
                <h3 className="text-[15px] font-semibold text-ink-900">
                  {eq.recommended.product.manufacturer} {eq.recommended.product.model}
                </h3>
                <Badge tone="accent">Fit {Math.round(eq.recommended.fitScore)}/100</Badge>
                {!eq.recommended.product.specsVerified && <Badge tone="warn">Specs unverified</Badge>}
                {eq.overridden && <Badge tone="warn">Operator override</Badge>}
              </div>
              <Bullets items={eq.rationale} />
              <div className="mt-4 grid gap-x-8 gap-y-0 sm:grid-cols-2">
                <KeyValue
                  rows={[
                    { label: "Live machines", value: eq.liveMachines },
                    { label: "Spare machines", value: eq.spareMachines },
                    { label: "Derated capacity per machine", value: acres(eq.recommended.effectiveAcresPerMachine) },
                    { label: "Machine utilization", value: pct(eq.utilizationPct, 0) },
                    { label: "Autonomous acreage served", value: acres(eq.autonomousAcres) },
                  ]}
                />
                <KeyValue
                  rows={[
                    { label: "Fleet acquisition cost", value: money(result.capital.fleetAcquisitionCost) },
                    { label: "Annual cost per autonomous acre", value: money(eq.recommended.annualCostPerAutonomousAcre) },
                    { label: "Useful life", value: `${eq.recommended.product.usefulLifeYears} yr` },
                    { label: "Residual value", value: `${eq.recommended.product.residualValuePct}%` },
                    {
                      label: "Alternative",
                      value: eq.alternative ? `${eq.alternative.product.manufacturer} ${eq.alternative.product.model}` : "—",
                    },
                  ]}
                />
              </div>
              <h3 className="label-caps mt-4 mb-2">Reasons this product may not suit the site</h3>
              <Bullets items={[...eq.recommended.disqualifiers, ...eq.recommended.cautions]} tone="warn" />
            </>
          ) : (
            <p className="text-[12.5px] text-ink-500">No product could be matched.</p>
          )}
        </Section>

        <Section n={6} title="Deployment plan">
          <div className="grid items-start gap-x-8 gap-y-0 sm:grid-cols-2">
            <KeyValue
              rows={[
                { label: "Site survey labor", value: money(result.capital.deployment.surveyLabor) },
                { label: "Commissioning labor", value: money(result.capital.deployment.commissioningLabor) },
                { label: "Zone mapping labor", value: money(result.capital.deployment.zoneMappingLabor) },
                { label: "Crossing mapping labor", value: money(result.capital.deployment.crossingMappingLabor) },
                { label: "Total deployment labor hours", value: `${number(result.capital.deployment.totalHours, 1)} hr` },
              ]}
            />
            <KeyValue
              rows={[
                { label: "Install materials", value: money(result.capital.deployment.installMaterials) },
                { label: "Charging stations", value: money(result.capital.deployment.chargingStations) },
                { label: "RTK base station", value: money(result.capital.deployment.rtkBaseStation) },
                { label: "Mobilization", value: money(result.capital.deployment.mobilization) },
                { label: "Total deployment cost", value: money(result.capital.deployment.total) },
              ]}
            />
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-700">
            Commissioning window of {property.intervention.commissioningMonths} months at a{" "}
            {number(property.intervention.commissioningMultiplier, 1)}× intervention multiplier. Commissioning-year
            support burden is {number(result.intervention.commissioningYear.totalHumanHours, 0)} human hours against{" "}
            {number(result.intervention.stabilized.totalHumanHours, 0)} at steady state.
          </p>
        </Section>

        <Section n={7} title="Human-in-the-loop requirements">
          <Table>
            <thead>
              <tr>
                <Th>Measure</Th>
                <Th align="right">Commissioning year</Th>
                <Th align="right">Stabilized</Th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Physical interventions / machine / yr", result.intervention.commissioningYear.physicalInterventionsPerMachineYear, result.intervention.stabilized.physicalInterventionsPerMachineYear],
                ["Remote interventions / machine / yr", result.intervention.commissioningYear.remoteInterventionsPerMachineYear, result.intervention.stabilized.remoteInterventionsPerMachineYear],
                ["Scheduled visits / machine / yr", result.intervention.commissioningYear.scheduledVisitsPerMachineYear, result.intervention.stabilized.scheduledVisitsPerMachineYear],
                ["Site visits / yr", result.intervention.commissioningYear.siteVisitsPerYear, result.intervention.stabilized.siteVisitsPerYear],
                ["Field hours / machine / yr", result.intervention.commissioningYear.fieldHoursPerMachineYear, result.intervention.stabilized.fieldHoursPerMachineYear],
                ["Field hours total", result.intervention.commissioningYear.fieldHoursTotal, result.intervention.stabilized.fieldHoursTotal],
                ["Remote support hours total", result.intervention.commissioningYear.remoteHoursTotal, result.intervention.stabilized.remoteHoursTotal],
                ["Travel hours total", result.intervention.commissioningYear.travelHoursTotal, result.intervention.stabilized.travelHoursTotal],
                ["Total human hours", result.intervention.commissioningYear.totalHumanHours, result.intervention.stabilized.totalHumanHours],
              ].map(([label, c, s]) => (
                <tr key={label as string}>
                  <Td>{label as string}</Td>
                  <Td align="right" numeric>{number(c as number, 1)}</Td>
                  <Td align="right" numeric>{number(s as number, 1)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <h3 className="label-caps mt-4 mb-2">Expected intervention mix (stabilized, per machine per year)</h3>
          <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {result.intervention.categories.map((c) => (
              <div key={c.category} className="flex items-baseline justify-between gap-3 border-b border-ink-100 py-1">
                <span className="text-[12px] text-ink-600">{c.label}</span>
                <span className="tnum text-[12px] font-semibold text-ink-900">
                  {number(c.physicalPerMachineYear, 1)} ({number(c.sharePct, 0)}%)
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Bullets items={result.intervention.notes} />
          </div>
        </Section>

        <Section n={8} title="Existing landscaper / residual-scope plan">
          <Bullets items={result.residual.siteOperatingArchitecture} />
          <div className="mt-4 grid gap-x-8 gap-y-0 sm:grid-cols-2">
            <KeyValue
              rows={[
                { label: "Mowing scope replaced", value: pct(result.residual.replacedPct, 0) },
                { label: "Replaced incumbent spend", value: money(result.residual.replacedIncumbentMowingSpend) },
                { label: "Retained by a crew", value: money(result.residual.retainedIncumbentMowingSpend) },
              ]}
            />
            <KeyValue
              rows={[
                { label: "Landscaper remains onsite", value: property.residual.landscaperRemainsOnsite ? "Yes" : "No" },
                { label: "Can support robot tasks", value: property.residual.landscaperCanSupportRobots ? "Yes" : "No" },
                { label: "Proposed role", value: LANDSCAPER_ROLE_LABELS[property.residual.landscaperRole] },
              ]}
            />
          </div>
          <h3 className="label-caps mt-4 mb-2">Residual services (not our revenue or cost)</h3>
          <Table>
            <thead>
              <tr>
                <Th>Service</Th>
                <Th>In incumbent scope</Th>
                <Th>Performed by</Th>
                <Th align="right">Est. annual cost</Th>
              </tr>
            </thead>
            <tbody>
              {property.residual.lines.map((l) => (
                <tr key={l.service}>
                  <Td>{RESIDUAL_SERVICE_LABELS[l.service]}</Td>
                  <Td>{l.inIncumbentScope ? "Yes" : "No"}</Td>
                  <Td>{RESIDUAL_OWNER_LABELS[l.owner]}</Td>
                  <Td align="right" numeric>{l.estimatedAnnualCost > 0 ? money(l.estimatedAnnualCost) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>

        <Section n={9} title="Customer value proposition">
          <div className="grid items-start gap-x-8 gap-y-0 sm:grid-cols-2">
            <div>
              <h3 className="label-caps mb-1">Current state</h3>
              <KeyValue rows={result.value.currentState.map((x) => ({ label: x.label, value: x.value }))} />
            </div>
            <div>
              <h3 className="label-caps mb-1">Proposed robotic state</h3>
              <KeyValue rows={result.value.proposedState.map((x) => ({ label: x.label, value: x.value }))} />
            </div>
          </div>
          <h3 className="label-caps mt-4 mb-2">Qualitative operational benefits</h3>
          <Bullets items={result.value.qualitativeBenefits} tone="good" />
        </Section>

        <Section n={10} title="Pricing">
          <Table>
            <thead>
              <tr>
                <Th>Pricing approach</Th>
                <Th align="right">Target savings</Th>
                <Th align="right">Annual price</Th>
                <Th align="right">Customer savings</Th>
                <Th align="right">Margin</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {result.value.approaches.map((a) => (
                <tr key={a.approach} className={a.approach === property.customerValue.pricingApproach ? "bg-accent-50" : ""}>
                  <Td className="font-medium text-ink-900">{a.label}</Td>
                  <Td align="right" numeric>{pct(a.targetSavingsPct)}</Td>
                  <Td align="right" numeric>{money(a.annualPrice)}</Td>
                  <Td align="right" numeric>{money(a.customerSavings)}</Td>
                  <Td align="right" numeric>{pct(a.marginAtThisPrice)}</Td>
                  <Td>{a.belowFloor ? "Below cost floor" : "Clears floor"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>

          <h3 className="label-caps mt-4 mb-2">Contract structure and capital recovery</h3>
          <Table>
            <thead>
              <tr>
                <Th>Structure</Th>
                <Th align="right">Seasons</Th>
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
                <tr key={o.structure} className={o.structure === result.contract.selected.structure ? "bg-accent-50" : ""}>
                  <Td className="font-medium text-ink-900">{o.structureLabel}</Td>
                  <Td align="right" numeric>{number(o.committedSeasons, 2)}</Td>
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
          <div className="mt-3">
            <Bullets items={[...result.contract.commentary, ...result.contract.selected.notes]} />
          </div>
        </Section>

        <Section n={11} title="Operator economics">
          <Table>
            <thead>
              <tr>
                <Th>Line</Th>
                <Th>Basis</Th>
                <Th align="right">Annual</Th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-ink-50">
                <Td className="font-semibold">Revenue</Td>
                <Td />
                <Td />
              </tr>
              {e.revenue.lines.map((l) => (
                <tr key={l.key}>
                  <Td className="pl-6">{l.label}</Td>
                  <Td className="text-[11.5px] text-ink-500">{l.basis}</Td>
                  <Td align="right" numeric>{money(l.amount)}</Td>
                </tr>
              ))}
              <tr>
                <Td className="font-semibold">Total revenue</Td>
                <Td />
                <Td align="right" numeric className="font-semibold">{money(e.revenue.total)}</Td>
              </tr>
              <tr className="bg-ink-50">
                <Td className="font-semibold">Direct operating cost</Td>
                <Td />
                <Td />
              </tr>
              {e.cost.lines.map((l) => (
                <tr key={l.key}>
                  <Td className="pl-6">{l.label}</Td>
                  <Td className="text-[11.5px] text-ink-500">{l.basis}</Td>
                  <Td align="right" numeric>{money(l.amount)}</Td>
                </tr>
              ))}
              <tr>
                <Td className="font-semibold">Total direct cost</Td>
                <Td />
                <Td align="right" numeric className="font-semibold">{money(e.cost.total)}</Td>
              </tr>
              <tr className="bg-accent-50">
                <Td className="font-semibold">Property contribution</Td>
                <Td className="text-[11.5px] text-ink-600">{pct(e.contributionMarginPct)} contribution margin</Td>
                <Td align="right" numeric className="font-semibold">{money(e.contribution)}</Td>
              </tr>
            </tbody>
          </Table>
          <div className="mt-4 grid gap-x-8 gap-y-0 sm:grid-cols-2">
            <KeyValue
              rows={[
                { label: "Contribution per autonomous acre", value: money(e.contributionPerAutonomousAcre) },
                { label: "Contribution per machine", value: money(e.contributionPerMachine) },
                { label: "Contribution per technician hour", value: money(e.contributionPerTechnicianHour) },
                { label: "Commissioning-year contribution", value: money(e.commissioningYearContribution) },
              ]}
            />
            <KeyValue
              rows={[
                { label: "Upfront operator capital", value: money(e.upfrontOperatorCapital) },
                { label: "Payback period", value: e.paybackYears === null ? "—" : `${number(e.paybackYears, 2)} seasons` },
                { label: "Economic break-even", value: e.breakEvenDate ?? "—" },
                { label: "Underwriting verdict", value: titleCase(e.underwritingVerdict) },
              ]}
            />
          </div>
        </Section>

        <Section n={12} title="Risks">
          <Bullets items={r.majorRisks} tone="bad" />
        </Section>

        <Section n={13} title="Recommendation">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <DecisionBadge decision={r.decision} overridden={r.decisionIsOverridden} />
            <span className="text-[12.5px] text-ink-500">
              Readiness {Math.round(result.readiness.score)} · Opportunity {Math.round(r.opportunityScore)} · Cluster{" "}
              {Math.round(result.cluster.score)}
            </span>
          </div>
          <Bullets items={r.decisionRationale} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-[13px] font-semibold text-good-700">Why This Site Works</h3>
              <Bullets items={r.whyThisSiteWorks} tone="good" />
            </div>
            <div>
              <h3 className="mb-2 text-[13px] font-semibold text-bad-500">What Could Break the Model</h3>
              <Bullets items={r.whatCouldBreakTheModel} tone="bad" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="label-caps mb-2">Deal summary</h3>
            <div className="grid items-start gap-x-8 gap-y-0 sm:grid-cols-2">
              <KeyValue
                rows={[
                  { label: "Recommended equipment", value: eq.recommended ? `${eq.recommended.product.manufacturer} ${eq.recommended.product.model}` : "—" },
                  { label: "Machine count", value: `${eq.liveMachines} live + ${eq.spareMachines} spare` },
                  { label: "Estimated autonomous acreage", value: acres(eq.autonomousAcres) },
                  { label: "Expected intervention rate", value: `${number(result.intervention.physicalPerMachineMonth, 2)} / machine / mo` },
                  { label: "Expected human hours", value: `${number(result.intervention.stabilized.totalHumanHours, 0)} / yr` },
                ]}
              />
              <KeyValue
                rows={[
                  { label: "Customer price", value: money(result.value.recommendedAnnualPrice) },
                  { label: "Customer savings", value: `${money(result.value.annualCustomerSavings)} (${pct(result.value.savingsPct)})` },
                  { label: "Operator contribution margin", value: pct(e.contributionMarginPct) },
                  { label: "Capital required", value: money(e.upfrontOperatorCapital) },
                  { label: "Recommended contract", value: `${result.contract.selected.structureLabel} · ${result.contract.selected.mechanismLabel}` },
                ]}
              />
            </div>
          </div>
        </Section>

        <Section n={14} title="Open diligence items">
          <Bullets items={r.requiredDiligence} />
          <div className="mt-4">
            <Callout tone="warn" title="Standing caveat">
              This report is a pre-visit screen built on manual measurements and placeholder equipment and cost
              assumptions. It is intended to decide whether a site earns a physical visit or a pilot — not to support a
              signed contract on its own.
            </Callout>
          </div>
        </Section>

        <footer className="border-t border-ink-200 pt-3 text-[10.5px] text-ink-400">
          TurfOps MVP · Readiness weights, intervention model, cost assumptions and underwriting thresholds in force at
          generation time are recorded in the Assumptions module. Changing them changes this report.
        </footer>
      </article>
    </>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card title={`${n}. ${title}`} className={n > 1 ? "print-break" : ""}>
      {children}
    </Card>
  );
}
