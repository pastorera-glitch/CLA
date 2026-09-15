import type { Assumptions, MowerProduct, Property } from "@/lib/types";
import { computeCapital, type CapitalResult } from "./capital";
import { computeClusterScore, type ClusterResult } from "./cluster";
import { computeContractOptions, type ContractResult } from "./contract";
import { computeEconomics, type EconomicsResult } from "./economics";
import { matchEquipment, type EquipmentResult } from "./equipment";
import { computeIntervention, type InterventionResult } from "./intervention";
import { computeOperatingCosts, type OperatingCostResult } from "./opex";
import { computeReadiness, type ReadinessResult } from "./readiness";
import { computeRecommendation, type RecommendationResult } from "./recommendation";
import { computeResidual, type ResidualResult } from "./residual";
import { computeCustomerValue, type CustomerValueResult } from "./value";
import { div } from "./util";

export * from "./util";
export * from "./cluster";
export * from "./readiness";
export * from "./equipment";
export * from "./intervention";
export * from "./capital";
export * from "./opex";
export * from "./contract";
export * from "./residual";
export * from "./value";
export * from "./economics";
export * from "./recommendation";

export interface UnderwritingResult {
  property: Property;
  cluster: ClusterResult;
  readiness: ReadinessResult;
  equipment: EquipmentResult;
  intervention: InterventionResult;
  capital: CapitalResult;
  stabilizedCost: OperatingCostResult;
  commissioningCost: OperatingCostResult;
  contract: ContractResult;
  residual: ResidualResult;
  value: CustomerValueResult;
  economics: EconomicsResult;
  recommendation: RecommendationResult;
}

/**
 * Single entry point for the calculation engine.
 *
 * Evaluation order matters and is fixed here:
 *   cluster -> readiness -> equipment -> intervention -> capital -> operating cost
 *   -> contract pricing (solves the cost floor) -> residual -> customer value
 *   -> operator economics -> recommendation
 *
 * Nothing in this function touches React, the DOM or storage. It is a pure
 * function of (property, products, assumptions) so it can be unit-tested and
 * later moved server-side without change.
 */
export function runUnderwriting(
  property: Property,
  products: MowerProduct[],
  a: Assumptions,
): UnderwritingResult {
  const cluster = computeClusterScore(property.cluster, a);
  const readiness = computeReadiness(property.assessment, cluster.score, a);

  const equipment = matchEquipment(property.assessment, products, readiness.score, property.equipment, a);

  const intervention = computeIntervention(
    property.intervention,
    readiness.score,
    equipment.liveMachines,
    equipment.totalMachines,
    equipment.machineOperatingHoursPerYear,
    a,
  );

  const capital = computeCapital(
    equipment.recommended?.product ?? null,
    equipment.liveMachines,
    equipment.spareMachines,
    property.assessment,
    property.economics,
    a,
  );

  const stabilizedCost = computeOperatingCosts(intervention, capital, a, "stabilized");
  const commissioningCost = computeOperatingCosts(intervention, capital, a, "commissioning");

  const contract = computeContractOptions(
    property.contract,
    {
      annualOperatingCost: stabilizedCost.lines.total,
      capital,
      targetMarginPct: a.thresholds.targetContributionMarginPct,
      variableAdminPctOfRevenue: a.fleetOpex.variableAdminPctOfRevenue,
    },
    a,
  );

  const residual = computeResidual(
    property.residual,
    property.assessment,
    property.intake,
    property.intake.estimatedMowingOnlyCost,
    property.intake.annualMowingVisits,
  );

  // Annual cost at the floor price, excluding revenue-scaling admin. Used so the
  // value module can report the margin implied by each pricing approach.
  const annualCostAtFloor =
    stabilizedCost.lines.total +
    capital.machineAnnualEconomicCost +
    capital.financingAnnualCost +
    contract.selected.deploymentRecoveryAnnual +
    contract.selected.contractFlexibilityPremiumAnnual;

  const value = computeCustomerValue(
    property.customerValue,
    residual,
    property.intake.estimatedMowingOnlyCost,
    property.intake.annualMowingVisits,
    equipment.autonomousAcres,
    contract.selected.requiredAnnualRecurringPrice,
    property.economics.annualPriceOverride,
    intervention.stabilized,
    a.fleetOpex.variableAdminPctOfRevenue,
    annualCostAtFloor,
    a,
  );

  const economics = computeEconomics(
    contract.selected,
    stabilizedCost,
    commissioningCost,
    capital,
    intervention,
    property.economics,
    value.recommendedAnnualPrice,
    equipment.autonomousAcres,
    a,
  );

  const recommendation = computeRecommendation(
    property,
    readiness,
    cluster,
    equipment,
    intervention,
    residual,
    value,
    economics,
    a,
  );

  return {
    property,
    cluster,
    readiness,
    equipment,
    intervention,
    capital,
    stabilizedCost,
    commissioningCost,
    contract,
    residual,
    value,
    economics,
    recommendation,
  };
}

/** Condensed row used by dashboards and property tables. */
export interface PropertySummary {
  id: string;
  name: string;
  address: string;
  propertyType: Property["intake"]["propertyType"];
  autonomousAcres: number;
  totalTurfAcres: number;
  readinessScore: number;
  readinessBandLabel: string;
  opportunityScore: number;
  clusterScore: number;
  recommendedProduct: string;
  machinesRequired: number;
  annualServicePrice: number;
  customerSavings: number;
  customerSavingsPct: number;
  contributionMarginPct: number;
  contribution: number;
  upfrontCapital: number;
  decision: RecommendationResult["decision"];
  decisionLabel: string;
}

export function summarize(result: UnderwritingResult): PropertySummary {
  const p = result.property;
  return {
    id: p.id,
    name: p.intake.name,
    address: [p.intake.addressLine1, p.intake.city, p.intake.state].filter(Boolean).join(", "),
    propertyType: p.intake.propertyType,
    autonomousAcres: result.equipment.autonomousAcres,
    totalTurfAcres: p.assessment.geometry.totalTurfAcres,
    readinessScore: result.readiness.score,
    readinessBandLabel: result.readiness.bandLabel,
    opportunityScore: result.recommendation.opportunityScore,
    clusterScore: result.cluster.score,
    recommendedProduct: result.equipment.recommended
      ? `${result.equipment.recommended.product.manufacturer} ${result.equipment.recommended.product.model}`
      : "—",
    machinesRequired: result.equipment.liveMachines,
    annualServicePrice: result.value.recommendedAnnualPrice,
    customerSavings: result.value.annualCustomerSavings,
    customerSavingsPct: result.value.savingsPct,
    contributionMarginPct: result.economics.contributionMarginPct,
    contribution: result.economics.contribution,
    upfrontCapital: result.economics.upfrontOperatorCapital,
    decision: result.recommendation.decision,
    decisionLabel: result.recommendation.decisionLabel,
  };
}

/** Portfolio-level rollup for the dashboard. */
export function portfolioRollup(summaries: PropertySummary[]) {
  const n = summaries.length;
  const totalAcres = summaries.reduce((s, x) => s + x.autonomousAcres, 0);
  const totalRevenue = summaries.reduce((s, x) => s + x.annualServicePrice, 0);
  const totalContribution = summaries.reduce((s, x) => s + x.contribution, 0);
  const totalCapital = summaries.reduce((s, x) => s + x.upfrontCapital, 0);
  const totalMachines = summaries.reduce((s, x) => s + x.machinesRequired, 0);
  return {
    propertyCount: n,
    totalAutonomousAcres: totalAcres,
    totalAnnualRevenue: totalRevenue,
    totalContribution,
    blendedMarginPct: div(totalContribution, totalRevenue, 0) * 100,
    totalUpfrontCapital: totalCapital,
    totalMachines,
    avgReadiness: div(
      summaries.reduce((s, x) => s + x.readinessScore, 0),
      n,
      0,
    ),
    avgOpportunity: div(
      summaries.reduce((s, x) => s + x.opportunityScore, 0),
      n,
      0,
    ),
    pursueCount: summaries.filter((x) => x.decision === "pursue" || x.decision === "pursue_subject_to_site_visit").length,
    rejectCount: summaries.filter((x) => x.decision === "reject").length,
  };
}
