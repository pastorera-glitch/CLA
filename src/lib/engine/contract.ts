import type {
  Assumptions,
  ContractInputs,
  ContractStructure,
  PricingMechanism,
} from "@/lib/types";
import {
  CONTRACT_STRUCTURES,
  CONTRACT_STRUCTURE_LABELS,
  PRICING_MECHANISMS,
  PRICING_MECHANISM_LABELS,
} from "@/lib/types";
import type { CapitalResult } from "./capital";
import { clamp, div } from "./util";

/** Seasons of committed revenue implied by each contract structure. */
export function seasonsFor(structure: ContractStructure, customSeasons: number): number {
  switch (structure) {
    case "half_season_pilot":
      return 0.5;
    case "full_season":
      return 1;
    case "two_season":
      return 2;
    case "three_season":
      return 3;
    case "thirty_day_cancellable":
      // Contractually zero committed seasons; modeled as a partial season of
      // expected revenue so the economics do not divide by zero.
      return 0.25;
    case "custom":
      return Math.max(0.25, customSeasons);
  }
}

export interface ContractOption {
  structure: ContractStructure;
  structureLabel: string;
  mechanism: PricingMechanism;
  mechanismLabel: string;
  committedSeasons: number;
  /** Years over which deployment cost is recovered under this mechanism. */
  deploymentRecoveryYears: number;

  deploymentRecoveryAnnual: number;
  equipmentCapitalRecoveryAnnual: number;
  financingAnnual: number;

  terminationProbabilityPct: number;
  /** Capital not yet recovered if the customer terminates at the term midpoint. */
  expectedUnrecoveredCapital: number;
  unamortizedDeploymentAtTermination: number;
  redeploymentCost: number;
  idleCarryingCost: number;
  /** Machine value still retained (recoverable by redeploying, not a loss). */
  residualMachineValueAtTermination: number;

  contractFlexibilityPremiumAnnual: number;

  upfrontCustomerFee: number;
  requiredAnnualRecurringPrice: number;
  /** Upfront fee plus the recurring price, annualized over the committed term. */
  requiredTotalAnnualizedPrice: number;
  earlyTerminationCharge: number;

  notes: string[];
}

export interface ContractResult {
  selected: ContractOption;
  /** Every structure priced under the selected mechanism. */
  structureComparison: ContractOption[];
  /** Every mechanism priced under the selected structure. */
  mechanismComparison: ContractOption[];
  commentary: string[];
}

export interface ContractPricingContext {
  /** Recurring direct operating cost excluding capital, deployment, admin, risk. */
  annualOperatingCost: number;
  capital: CapitalResult;
  /** Target contribution margin expressed 0–100. */
  targetMarginPct: number;
  variableAdminPctOfRevenue: number;
}

/**
 * Prices every contract structure x mechanism combination.
 *
 * The central point the model must make visible: shorter commitments leave more
 * unrecovered capital on the table, so they require either a higher recurring
 * price, an upfront implementation fee, or an explicit termination charge.
 */
export function computeContractOptions(
  input: ContractInputs,
  ctx: ContractPricingContext,
  a: Assumptions,
): ContractResult {
  const price = (structure: ContractStructure, mechanism: PricingMechanism) =>
    priceOption(structure, mechanism, input, ctx, a);

  const selected = price(input.structure, input.mechanism);
  const structureComparison = CONTRACT_STRUCTURES.map((s) => price(s, input.mechanism));
  const mechanismComparison = PRICING_MECHANISMS.map((m) => price(input.structure, m));

  const shortest = structureComparison.find((o) => o.structure === "thirty_day_cancellable");
  const longest = structureComparison.find((o) => o.structure === "three_season");
  const commentary: string[] = [];
  if (shortest && longest && longest.requiredTotalAnnualizedPrice > 0) {
    const delta = div(
      shortest.requiredTotalAnnualizedPrice - longest.requiredTotalAnnualizedPrice,
      longest.requiredTotalAnnualizedPrice,
      0,
    );
    commentary.push(
      `Under the selected mechanism, a 30-day cancellable structure requires ${(delta * 100).toFixed(1)}% more annualized revenue than a three-season commitment to hit the same ${ctx.targetMarginPct}% contribution margin. That gap is the price of contractual flexibility, not a markup.`,
    );
  }
  commentary.push(
    `Deployment cost of ${fmt(ctx.capital.deployment.total)} and fleet capital of ${fmt(ctx.capital.fleetAcquisitionCost)} are committed before the first invoice. The recovery window is what changes between structures.`,
  );
  commentary.push(
    "No structure is marked correct by the model. A, C and D shift where the money is collected; E and F shift who carries the termination risk.",
  );

  return { selected, structureComparison, mechanismComparison, commentary };
}

function priceOption(
  structure: ContractStructure,
  mechanism: PricingMechanism,
  input: ContractInputs,
  ctx: ContractPricingContext,
  a: Assumptions,
  /** One-season list rate, supplied to avoid recursing when pricing mechanism D. */
  baseline?: number,
): ContractOption {
  const cap = ctx.capital;
  const committedSeasons = seasonsFor(structure, input.customSeasons);

  const modeledTerminationPct = a.pricing.terminationProbabilityPct[structure] ?? 20;
  const terminationProbabilityPct =
    input.terminationProbabilityOverridePct >= 0
      ? clamp(input.terminationProbabilityOverridePct, 0, 100)
      : modeledTerminationPct;

  // Mechanism A collects part of deployment up front; that portion is never at risk.
  const upfrontCoverageFrac =
    mechanism === "A_upfront_deployment_fee" ? clamp(input.upfrontDeploymentFeeCoveragePct / 100, 0, 1) : 0;
  const upfrontCustomerFee = cap.deployment.total * upfrontCoverageFrac;
  const deploymentAtRisk = cap.deployment.total - upfrontCustomerFee;

  // Mechanisms E and F bet on redeployment and recover deployment over the fleet's
  // useful life; everything else recovers it inside the contract term.
  const recoversOverUsefulLife =
    mechanism === "E_early_termination_charge" || mechanism === "F_probabilistic_risk_pricing";
  const deploymentRecoveryYears = recoversOverUsefulLife
    ? Math.max(committedSeasons, cap.usefulLifeYears)
    : Math.max(0.25, committedSeasons);

  const deploymentRecoveryAnnual = div(deploymentAtRisk, deploymentRecoveryYears, 0);

  // Termination is modeled at the midpoint of the committed term.
  const elapsedFrac = 0.5;
  const recoveredFrac = clamp(div(committedSeasons * elapsedFrac, deploymentRecoveryYears, 0), 0, 1);
  const unamortizedDeploymentAtTermination = deploymentAtRisk * (1 - recoveredFrac);

  const redeploymentCost = a.capital.redeploymentCostPerMachine * cap.totalMachines;
  const idleCarryingCost =
    (cap.machineAnnualEconomicCost / 12) * a.capital.redeploymentIdleMonths;

  const elapsedYears = committedSeasons * elapsedFrac;
  const depreciatedFrac = clamp(div(elapsedYears, cap.usefulLifeYears, 0), 0, 1);
  const residualMachineValueAtTermination =
    cap.fleetAcquisitionCost -
    (cap.fleetAcquisitionCost - cap.fleetResidualValue) * depreciatedFrac;

  const expectedUnrecoveredCapital =
    unamortizedDeploymentAtTermination + redeploymentCost + idleCarryingCost;

  // Mechanism E transfers most of the exposure to a contractual charge; only the
  // uncollectible share is priced into the recurring fee.
  const collectibilityFrac =
    mechanism === "E_early_termination_charge" ? clamp(a.pricing.earlyTerminationChargeCollectibilityPct / 100, 0, 1) : 0;
  const riskBorneFrac = 1 - collectibilityFrac;

  const expectedLoss = (terminationProbabilityPct / 100) * expectedUnrecoveredCapital * riskBorneFrac;
  const contractFlexibilityPremiumAnnual = div(expectedLoss, Math.max(0.5, committedSeasons), expectedLoss);

  const annualCostBase =
    ctx.annualOperatingCost +
    cap.machineAnnualEconomicCost +
    cap.financingAnnualCost +
    deploymentRecoveryAnnual +
    contractFlexibilityPremiumAnnual;

  // Solve revenue for the target contribution margin, accounting for variable
  // administration that scales with revenue:
  //   revenue - cost - admin% x revenue = margin% x revenue
  const marginFrac = clamp(ctx.targetMarginPct / 100, 0, 0.9);
  const adminFrac = clamp(ctx.variableAdminPctOfRevenue / 100, 0, 0.5);
  const denominator = Math.max(0.05, 1 - marginFrac - adminFrac);
  let requiredAnnualRecurringPrice = div(annualCostBase, denominator, 0);

  if (mechanism === "C_higher_short_term_rate") {
    // Short-term uplift scales down as the commitment lengthens.
    const shortnessFrac = clamp(div(1, Math.max(0.5, committedSeasons), 1), 0, 2);
    requiredAnnualRecurringPrice *= 1 + (a.pricing.shortTermRateUpliftPct / 100) * shortnessFrac;
  }
  if (mechanism === "D_multi_season_discount") {
    // Discount from the one-season list rate rather than from this structure's
    // own floor, so a longer commitment is rewarded without pricing below cost.
    const discountPct = Math.min(
      a.pricing.maxMultiSeasonDiscountPct,
      a.pricing.multiSeasonDiscountPctPerSeason * Math.max(0, committedSeasons - 1),
    );
    const listRate = baseline
      ? baseline
      : priceOption("full_season", "B_all_inclusive_recurring", input, ctx, a, requiredAnnualRecurringPrice)
          .requiredAnnualRecurringPrice;
    requiredAnnualRecurringPrice = Math.max(requiredAnnualRecurringPrice, listRate * (1 - discountPct / 100));
  }

  const earlyTerminationCharge =
    mechanism === "E_early_termination_charge"
      ? unamortizedDeploymentAtTermination + redeploymentCost
      : 0;

  const requiredTotalAnnualizedPrice =
    requiredAnnualRecurringPrice + div(upfrontCustomerFee, Math.max(0.5, committedSeasons), upfrontCustomerFee);

  const notes = mechanismNotes(
    mechanism,
    structure,
    upfrontCustomerFee,
    earlyTerminationCharge,
    terminationProbabilityPct,
    contractFlexibilityPremiumAnnual,
    a,
  );

  return {
    structure,
    structureLabel: CONTRACT_STRUCTURE_LABELS[structure],
    mechanism,
    mechanismLabel: PRICING_MECHANISM_LABELS[mechanism],
    committedSeasons,
    deploymentRecoveryYears,
    deploymentRecoveryAnnual,
    equipmentCapitalRecoveryAnnual: cap.machineAnnualEconomicCost,
    financingAnnual: cap.financingAnnualCost,
    terminationProbabilityPct,
    expectedUnrecoveredCapital,
    unamortizedDeploymentAtTermination,
    redeploymentCost,
    idleCarryingCost,
    residualMachineValueAtTermination,
    contractFlexibilityPremiumAnnual,
    upfrontCustomerFee,
    requiredAnnualRecurringPrice,
    requiredTotalAnnualizedPrice,
    earlyTerminationCharge,
    notes,
  };
}

function mechanismNotes(
  mechanism: PricingMechanism,
  structure: ContractStructure,
  upfrontFee: number,
  earlyTerminationCharge: number,
  terminationPct: number,
  premium: number,
  a: Assumptions,
): string[] {
  const label = CONTRACT_STRUCTURE_LABELS[structure];
  switch (mechanism) {
    case "A_upfront_deployment_fee":
      return [
        `Customer pays ${fmt(upfrontFee)} at deployment, which removes that capital from termination exposure entirely.`,
        `Recurring fee falls accordingly. Best where the customer will fund implementation but wants a low run rate.`,
      ];
    case "B_all_inclusive_recurring":
      return [
        `No upfront fee. Deployment is recovered inside the ${label.toLowerCase()} term, which is why short structures price high.`,
        `Termination risk of ${terminationPct}% is carried in the recurring fee as ${fmt(premium)}/yr.`,
      ];
    case "C_higher_short_term_rate":
      return [
        `A flat ${a.pricing.shortTermRateUpliftPct}% uplift scaled by how short the commitment is. Simple to quote, harder to defend line by line.`,
      ];
    case "D_multi_season_discount":
      return [
        `Prices the long commitment down rather than the short one up: ${a.pricing.multiSeasonDiscountPctPerSeason}% per additional season, capped at ${a.pricing.maxMultiSeasonDiscountPct}%.`,
        `Reads better commercially than an explicit flexibility surcharge.`,
      ];
    case "E_early_termination_charge":
      return [
        `Deployment is recovered over the fleet's useful life, backed by a ${fmt(earlyTerminationCharge)} unamortized-deployment charge on early termination.`,
        `Only the uncollectible share (${100 - a.pricing.earlyTerminationChargeCollectibilityPct}%) is priced into the recurring fee. Enforceability is a legal question, not a modeling one.`,
      ];
    case "F_probabilistic_risk_pricing":
      return [
        `Operator carries the termination risk and prices it: ${terminationPct}% probability x expected unrecovered capital = ${fmt(premium)}/yr.`,
        `Only defensible at portfolio scale, where the law of large numbers actually applies.`,
      ];
  }
}

function fmt(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
