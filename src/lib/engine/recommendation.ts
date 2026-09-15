import type { Assumptions, DecisionStatus, Property } from "@/lib/types";
import { DECISION_STATUS_LABELS } from "@/lib/types";
import type { ClusterResult } from "./cluster";
import type { EconomicsResult } from "./economics";
import type { EquipmentResult } from "./equipment";
import type { InterventionResult } from "./intervention";
import type { ReadinessResult } from "./readiness";
import type { ResidualResult } from "./residual";
import type { CustomerValueResult } from "./value";
import { clamp100, div, scaleScore, weightedAverage } from "./util";

export interface OpportunityComponent {
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface RecommendationResult {
  opportunityScore: number;
  opportunityComponents: OpportunityComponent[];
  decision: DecisionStatus;
  decisionLabel: string;
  decisionIsOverridden: boolean;
  decisionRationale: string[];
  whyThisSiteWorks: string[];
  whatCouldBreakTheModel: string[];
  majorRisks: string[];
  requiredDiligence: string[];
}

/** Blends site quality, economics and portfolio fit into a single 0–100 opportunity score. */
export function computeRecommendation(
  property: Property,
  readiness: ReadinessResult,
  cluster: ClusterResult,
  equipment: EquipmentResult,
  intervention: InterventionResult,
  residual: ResidualResult,
  value: CustomerValueResult,
  economics: EconomicsResult,
  a: Assumptions,
): RecommendationResult {
  const t = a.thresholds;

  const marginScore = scaleScore(economics.contributionMarginPct, t.targetContributionMarginPct + 10, 0);
  const scaleScoreAcres = scaleScore(equipment.autonomousAcres, 8, 0.5);
  const headroom = div(value.incumbentMowingOnlyCost, Math.max(0.1, equipment.autonomousAcres), 0);
  const pricingHeadroomScore = scaleScore(headroom, 3500, 600);
  const utilizationScore = scaleScore(Math.abs(equipment.utilizationPct - 78), 0, 45);
  const paybackScore =
    economics.paybackYears === null ? 0 : scaleScore(economics.paybackYears, 0.75, t.targetPaybackYears * 2);

  // Is the required price actually sellable against what the incumbent charges?
  const priceAcceptabilityScore = scaleScore(value.savingsPct, 15, -t.maxAcceptablePremiumPct);

  const opportunityComponents: OpportunityComponent[] = [
    {
      label: "Price acceptability",
      score: priceAcceptabilityScore,
      weight: 0.15,
      detail:
        value.savingsPct >= 0
          ? `Quoted price saves the customer ${value.savingsPct.toFixed(1)}% on the replaced mowing scope.`
          : `Quoted price is a ${(-value.savingsPct).toFixed(1)}% premium over the replaced mowing scope, against a ${t.maxAcceptablePremiumPct}% tolerance.`,
    },
    {
      label: "Contribution margin",
      score: marginScore,
      weight: 0.25,
      detail: `${economics.contributionMarginPct.toFixed(1)}% steady-state against a ${t.targetContributionMarginPct}% target.`,
    },
    {
      label: "Deployment scale",
      score: scaleScoreAcres,
      weight: 0.1,
      detail: `${equipment.autonomousAcres.toFixed(2)} autonomous acres across ${equipment.liveMachines} machine(s).`,
    },
    {
      label: "Pricing headroom",
      score: pricingHeadroomScore,
      weight: 0.15,
      detail: `Incumbent spends ${money(headroom)} per autonomous acre. Higher incumbent spend leaves room to price.`,
    },
    {
      label: "Machine utilization",
      score: utilizationScore,
      weight: 0.12,
      detail: `${equipment.utilizationPct.toFixed(0)}% utilization against a ${t.minMachineUtilizationPct}–${t.maxMachineUtilizationPct}% target band.`,
    },
    {
      label: "Cluster fit",
      score: cluster.score,
      weight: 0.15,
      detail: `Cluster score ${cluster.score.toFixed(0)} (${cluster.classification.replace(/_/g, " ")}).`,
    },
    {
      label: "Capital payback",
      score: paybackScore,
      weight: 0.08,
      detail:
        economics.paybackYears === null
          ? "Negative contribution — capital never pays back at this price."
          : `${economics.paybackYears.toFixed(2)} yr payback on ${money(economics.upfrontOperatorCapital)} of operator capital.`,
    },
  ];

  const opportunityScore = clamp100(
    weightedAverage(opportunityComponents.map((c) => ({ value: c.score, weight: c.weight }))),
  );

  const decision = property.decisionOverride ?? deriveDecision(readiness, cluster, economics, equipment, value, a);
  const decisionRationale = buildDecisionRationale(readiness, cluster, economics, equipment, value, a, decision);

  return {
    opportunityScore,
    opportunityComponents,
    decision,
    decisionLabel: DECISION_STATUS_LABELS[decision],
    decisionIsOverridden: property.decisionOverride !== null,
    decisionRationale,
    whyThisSiteWorks: whyItWorks(readiness, cluster, equipment, intervention, value, economics, residual),
    whatCouldBreakTheModel: whatBreaks(readiness, cluster, equipment, intervention, value, economics, residual, a),
    majorRisks: majorRisks(readiness, cluster, equipment, economics, residual, a),
    requiredDiligence: diligence(property, readiness, equipment, residual),
  };
}

function deriveDecision(
  readiness: ReadinessResult,
  cluster: ClusterResult,
  economics: EconomicsResult,
  equipment: EquipmentResult,
  value: CustomerValueResult,
  a: Assumptions,
): DecisionStatus {
  const t = a.thresholds;
  const b = a.readinessBands;
  const margin = economics.contributionMarginPct;
  const blocked = (equipment.recommended?.disqualifiers.length ?? 0) > 0;

  // Economics below the reject floor, with no strategic reason to carry it.
  if (margin < t.rejectContributionMarginPct && cluster.classification !== "strategic_exception") {
    if (readiness.score < b.conditionalMin) return "reject";
    return "conditional";
  }
  if (readiness.score < b.conditionalMin) {
    return cluster.classification === "strategic_exception" ? "conditional" : "reject";
  }
  if (blocked) return "conditional";

  // A price the customer will not accept is not a deal, however good the margin is.
  const premiumPct = -value.savingsPct;
  if (premiumPct > t.maxAcceptablePremiumPct) {
    return readiness.score >= b.candidateMin ? "pilot_candidate" : "conditional";
  }

  if (readiness.score >= b.strongMin && margin >= t.targetContributionMarginPct) {
    return cluster.classification === "isolated" ? "pursue_subject_to_site_visit" : "pursue";
  }
  if (readiness.score >= b.candidateMin && margin >= t.targetContributionMarginPct) {
    return "pursue_subject_to_site_visit";
  }
  if (readiness.score >= b.candidateMin && margin >= t.conditionalContributionMarginPct) {
    return "pilot_candidate";
  }
  return "conditional";
}

function buildDecisionRationale(
  readiness: ReadinessResult,
  cluster: ClusterResult,
  economics: EconomicsResult,
  equipment: EquipmentResult,
  value: CustomerValueResult,
  a: Assumptions,
  decision: DecisionStatus,
): string[] {
  const out: string[] = [];
  out.push(
    `Robot Readiness ${readiness.score.toFixed(0)}/100 (${readiness.bandLabel}), cluster ${cluster.score.toFixed(0)}/100 (${cluster.classification.replace(/_/g, " ")}), steady-state contribution margin ${economics.contributionMarginPct.toFixed(1)}%.`,
  );
  out.push(economics.verdictNarrative);
  if (decision === "reject") {
    out.push(
      "The site fails on readiness, economics or both. Rejecting quickly is the point of this screen — the capital is better deployed on a site that clears.",
    );
  }
  if (decision === "pilot_candidate") {
    out.push(
      "Economics are acceptable but not at target. A half-season pilot buys real intervention data without committing full capital recovery to an unproven site.",
    );
  }
  if (decision === "pursue_subject_to_site_visit") {
    out.push(
      "The numbers support pursuing, but the score depends on measurements that have not been physically verified. Confirm on site before quoting.",
    );
  }
  if (value.priceSource === "cost_floor") {
    out.push(
      `Pricing is set by the cost floor of ${money(value.requiredFloorPrice)}, not by the customer's savings target. Confirm the customer will accept a ${value.savingsPct.toFixed(1)}% savings level.`,
    );
  }
  if ((equipment.recommended?.disqualifiers.length ?? 0) > 0) {
    out.push(
      `The best-fitting product currently carries a hard disqualifier: ${equipment.recommended?.disqualifiers[0]}`,
    );
  }
  if (-value.savingsPct > a.thresholds.maxAcceptablePremiumPct) {
    out.push(
      `The required price is a ${(-value.savingsPct).toFixed(1)}% premium over the replaced incumbent spend, beyond the ${a.thresholds.maxAcceptablePremiumPct}% premium we believe is sellable. The deal needs a lower cost base or a different value story, not a better pitch.`,
    );
  }
  if (cluster.classification === "strategic_exception") {
    out.push("Carried as a strategic exception — the portfolio rationale must be documented, not assumed.");
  }
  return out;
}

function whyItWorks(
  readiness: ReadinessResult,
  cluster: ClusterResult,
  equipment: EquipmentResult,
  intervention: InterventionResult,
  value: CustomerValueResult,
  economics: EconomicsResult,
  residual: ResidualResult,
): string[] {
  const out: string[] = [];
  const strengths = [...readiness.categories].sort((x, y) => y.score - x.score).slice(0, 3);
  for (const s of strengths) {
    if (s.score >= 65) out.push(`${s.label} scores ${s.score.toFixed(0)}/100. ${s.detail}`);
  }
  if (equipment.utilizationPct >= 60 && equipment.utilizationPct <= 92) {
    out.push(
      `Machine utilization of ${equipment.utilizationPct.toFixed(0)}% means the capital is actually working — the fleet is neither idle nor running without downtime headroom.`,
    );
  }
  if (economics.contributionMarginPct >= 30) {
    out.push(
      `The property contributes ${money(economics.contribution)} per year at a ${economics.contributionMarginPct.toFixed(1)}% margin, or ${money(economics.contributionPerTechnicianHour)} per technician hour consumed.`,
    );
  }
  if (cluster.score >= 60) out.push(...cluster.drivers);
  if (value.annualCustomerSavings > 0) {
    out.push(
      `Customer saves ${money(value.annualCustomerSavings)} (${value.savingsPct.toFixed(1)}%) on the replaced mowing scope while cut frequency rises.`,
    );
  }
  if (intervention.stabilized.siteVisitsPerYear <= 12) {
    out.push(
      `Stabilized support burden is ${intervention.stabilized.siteVisitsPerYear.toFixed(1)} site visits and ${intervention.stabilized.totalHumanHours.toFixed(0)} human hours per year across the fleet.`,
    );
  }
  if (residual.replacedPct >= 80) {
    out.push(
      `Robotics replaces ${residual.replacedPct.toFixed(0)}% of the incumbent mowing scope, so the vendor-consolidation argument is real rather than cosmetic.`,
    );
  }
  if (out.length === 0) out.push("No category on this site currently scores well enough to carry the deal.");
  return out;
}

function whatBreaks(
  readiness: ReadinessResult,
  cluster: ClusterResult,
  equipment: EquipmentResult,
  intervention: InterventionResult,
  value: CustomerValueResult,
  economics: EconomicsResult,
  residual: ResidualResult,
  a: Assumptions,
): string[] {
  const out: string[] = [];

  // Intervention sensitivity: what happens if the real rate is double the model's.
  const doubledFieldHours = intervention.stabilized.fieldHoursTotal * 2;
  const extraLaborCost =
    (doubledFieldHours - intervention.stabilized.fieldHoursTotal) *
      a.labor.fieldTechHourlyCost *
      a.labor.laborBurdenMultiplier +
    intervention.stabilized.travelHoursTotal * a.labor.travelHourlyCost;
  const marginAtDouble = div(economics.contribution - extraLaborCost, economics.revenue.total, 0) * 100;
  out.push(
    `Intervention rate is the model's softest input. If stabilized physical interventions come in at double the modeled ${intervention.physicalPerMachineMonth.toFixed(2)}/machine/month, contribution margin falls from ${economics.contributionMarginPct.toFixed(1)}% to roughly ${marginAtDouble.toFixed(1)}%.`,
  );

  if (equipment.utilizationPct < a.thresholds.minMachineUtilizationPct) {
    out.push(
      `Machine utilization of ${equipment.utilizationPct.toFixed(0)}% means we are carrying capital that is not cutting grass. One acre of measurement error changes the machine count.`,
    );
  }
  if (readiness.categories.find((c) => c.category === "autonomousTurfCompatibility")!.score < 75) {
    out.push(
      "Autonomous-compatible turf percentage is an estimate, not a measurement. If the real figure is 10 points lower, both the price and the machine count move.",
    );
  }
  for (const f of readiness.flags.filter((x) => x.severity === "critical").slice(0, 4)) {
    out.push(f.message);
  }
  if (cluster.classification === "isolated") {
    out.push(
      "Isolated deployment: a single unplanned dispatch consumes a half day of technician time that no other site shares.",
    );
  }
  if (value.priceSource === "cost_floor" || value.savingsPct < 5) {
    out.push(
      `Customer savings of ${value.savingsPct.toFixed(1)}% may not be enough to move an incumbent relationship. If we have to discount to close, the margin has nowhere to go.`,
    );
  }
  if (residual.replacedPct < 75) {
    out.push(
      `Only ${residual.replacedPct.toFixed(0)}% of the mowing scope is replaced, so the customer keeps a crew and the savings story competes with their existing vendor's bundled pricing.`,
    );
  }
  if (economics.paybackYears !== null && economics.paybackYears > a.thresholds.targetPaybackYears) {
    out.push(
      `Payback of ${economics.paybackYears.toFixed(2)} yr exceeds the ${a.thresholds.targetPaybackYears} yr target on a contract the customer may not renew.`,
    );
  }
  if (!equipment.recommended?.product.specsVerified) {
    out.push(
      "Every equipment specification behind the machine count and capital figure is an unverified placeholder. A 20% capacity error changes the fleet size.",
    );
  }
  for (const w of residual.warnings.slice(0, 2)) out.push(w);
  return out;
}

function majorRisks(
  readiness: ReadinessResult,
  cluster: ClusterResult,
  equipment: EquipmentResult,
  economics: EconomicsResult,
  residual: ResidualResult,
  a: Assumptions,
): string[] {
  const out: string[] = [];
  for (const f of readiness.flags.filter((x) => x.severity !== "watch")) out.push(f.message);
  for (const r of cluster.risks) out.push(r);
  for (const d of equipment.recommended?.disqualifiers ?? []) out.push(`Equipment: ${d}`);
  for (const c of (equipment.recommended?.cautions ?? []).slice(0, 3)) out.push(`Equipment: ${c}`);
  if (economics.contributionMarginPct < a.thresholds.conditionalContributionMarginPct) {
    out.push(`Economics: ${economics.verdictNarrative}`);
  }
  for (const w of residual.warnings) out.push(`Residual scope: ${w}`);
  return dedupe(out);
}

function diligence(
  property: Property,
  readiness: ReadinessResult,
  equipment: EquipmentResult,
  residual: ResidualResult,
): string[] {
  const out: string[] = [];
  out.push("Verify turf acreage and autonomous-compatible percentage against aerial imagery or a GPS walk — currently manual estimates.");
  out.push("Confirm charging location, power availability and a protected hardstand for the dock.");
  out.push("Run an on-site RTK / cellular signal survey before committing to an RTK-dependent platform.");
  if (equipment.recommended && !equipment.recommended.product.specsVerified) {
    out.push(
      `Verify ${equipment.recommended.product.manufacturer} ${equipment.recommended.product.model} specifications, commercial-use terms, dealer pricing and lead time. All catalog data is placeholder.`,
    );
  }
  if (property.intake.terminationProvision === "unknown" || !property.intake.contractExpiration) {
    out.push("Obtain the incumbent landscaping contract: termination provision, expiration and any auto-renewal.");
  } else if (property.intake.terminationProvision.includes("thirty")) {
    out.push("Incumbent contract is 30-day terminable — confirm our own contract can be structured to recover deployment capital.");
  }
  if (property.intake.estimatedMowingOnlyCost <= 0) {
    out.push("Obtain the incumbent mowing-only line item. Total landscaping spend is not a substitute.");
  }
  if (residual.replacedPct < 90) {
    out.push("Agree in writing who performs residual trimming, edging and bed work, and on what cadence.");
  }
  for (const f of readiness.flags.filter((x) => x.severity === "critical")) {
    out.push(`Resolve before proceeding: ${f.message}`);
  }
  if (property.intake.gis.measurementSource === "manual") {
    out.push("Replace manual measurements with a GIS/aerial measurement once that integration is live.");
  }
  for (const n of property.diligenceNotes) out.push(n);
  return dedupe(out);
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

function money(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
