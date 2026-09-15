import type { Assumptions, CustomerValueInputs, PricingApproach } from "@/lib/types";
import { PRICING_APPROACH_LABELS } from "@/lib/types";
import type { InterventionBurden } from "./intervention";
import type { ResidualResult } from "./residual";
import { div } from "./util";

export interface PricingApproachOption {
  approach: PricingApproach;
  label: string;
  targetSavingsPct: number;
  annualPrice: number;
  customerSavings: number;
  /** True when this price sits below the cost-based floor. */
  belowFloor: boolean;
  marginAtThisPrice: number;
}

export interface CustomerValueResult {
  incumbentMowingOnlyCost: number;
  replacedIncumbentSpend: number;
  retainedIncumbentSpend: number;

  /** Price the model recommends quoting. */
  recommendedAnnualPrice: number;
  /** Cost-based floor required to hit the target contribution margin. */
  requiredFloorPrice: number;
  priceSource: "override" | "value_approach" | "cost_floor";

  annualCustomerSavings: number;
  savingsPct: number;
  /** Positive = we are charging a premium over the replaced incumbent spend. */
  impliedPremiumPct: number;
  costPerAutonomousAcre: number;
  costPerSeason: number;
  incumbentCostPerAcre: number;
  incumbentCostPerVisit: number;

  approaches: PricingApproachOption[];
  currentState: Array<{ label: string; value: string }>;
  proposedState: Array<{ label: string; value: string }>;
  qualitativeBenefits: string[];
  warnings: string[];
}

/**
 * Customer value analysis.
 *
 * The model does NOT assume a customer needs a 15% discount. It prices four
 * approaches side by side and flags any of them that fall below the cost floor.
 */
export function computeCustomerValue(
  input: CustomerValueInputs,
  residual: ResidualResult,
  mowingOnlyCost: number,
  annualMowingVisits: number,
  autonomousAcres: number,
  requiredFloorPrice: number,
  priceOverride: number,
  stabilizedBurden: InterventionBurden,
  variableAdminPct: number,
  annualCostAtFloor: number,
  a: Assumptions,
): CustomerValueResult {
  const incumbentMowingOnlyCost = input.annualMowingOnlyCostOverride > 0 ? input.annualMowingOnlyCostOverride : mowingOnlyCost;
  const replacedIncumbentSpend = (incumbentMowingOnlyCost * residual.replacedPct) / 100;
  const retainedIncumbentSpend = incumbentMowingOnlyCost - replacedIncumbentSpend;

  const targetSavingsFor = (approach: PricingApproach): number => {
    switch (approach) {
      case "value":
        return a.pricing.valueSavingsPct;
      case "volume_switcher":
        return a.pricing.volumeSwitcherSavingsPct;
      case "premium_pilot":
        return a.pricing.premiumPilotSavingsPct;
      case "custom":
        return input.customTargetSavingsPct;
    }
  };

  const marginAt = (price: number) => {
    const admin = (price * variableAdminPct) / 100;
    const contribution = price - (annualCostAtFloor + admin);
    return div(contribution, price, 0) * 100;
  };

  const approaches: PricingApproachOption[] = (
    ["value", "volume_switcher", "premium_pilot", "custom"] as PricingApproach[]
  ).map((approach) => {
    const targetSavingsPct = targetSavingsFor(approach);
    const annualPrice = replacedIncumbentSpend * (1 - targetSavingsPct / 100);
    return {
      approach,
      label: PRICING_APPROACH_LABELS[approach],
      targetSavingsPct,
      annualPrice,
      customerSavings: replacedIncumbentSpend - annualPrice,
      belowFloor: annualPrice < requiredFloorPrice,
      marginAtThisPrice: marginAt(annualPrice),
    };
  });

  const selectedApproach = approaches.find((o) => o.approach === input.pricingApproach) ?? approaches[0];

  let recommendedAnnualPrice: number;
  let priceSource: CustomerValueResult["priceSource"];
  if (priceOverride > 0) {
    recommendedAnnualPrice = priceOverride;
    priceSource = "override";
  } else if (selectedApproach.annualPrice >= requiredFloorPrice) {
    recommendedAnnualPrice = selectedApproach.annualPrice;
    priceSource = "value_approach";
  } else {
    recommendedAnnualPrice = requiredFloorPrice;
    priceSource = "cost_floor";
  }

  const annualCustomerSavings = replacedIncumbentSpend - recommendedAnnualPrice;
  const savingsPct = div(annualCustomerSavings, replacedIncumbentSpend, 0) * 100;

  const currentState = [
    { label: "Annual mowing-only cost", value: money(incumbentMowingOnlyCost) },
    { label: "Mowing visits per year", value: `${annualMowingVisits}` },
    { label: "Cuts per month (in season)", value: `${input.currentCutsPerMonth}` },
    { label: "Cost per visit", value: money(div(incumbentMowingOnlyCost, Math.max(1, annualMowingVisits), 0)) },
    { label: "Crew visibility on site", value: ratingText(input.currentCrewVisibilityRating, "crew presence") },
    { label: "Service complaints", value: ratingText(input.currentComplaintsRating, "complaints") },
    { label: "Noise", value: ratingText(input.currentNoiseRating, "noise") },
    { label: "Fuel burned per year", value: `${input.currentFuelGallonsPerYear.toLocaleString()} gal` },
    { label: "Vendor-management burden", value: ratingText(input.vendorManagementBurdenRating, "burden") },
  ];

  const proposedState = [
    { label: "Autonomous mowing frequency", value: `${input.proposedCutsPerWeek}x per week, continuous` },
    { label: "Expected appearance consistency", value: `${input.expectedAppearanceConsistencyRating}/5` },
    { label: "Expected human service visits", value: `${stabilizedBurden.siteVisitsPerYear.toFixed(1)} per year` },
    { label: "Expected field hours on site", value: `${stabilizedBurden.fieldHoursTotal.toFixed(1)} per year` },
    { label: "Monitoring", value: "Centralized remote fleet monitoring" },
    { label: "Equipment ownership", value: "Retained by operator — no customer capital" },
    { label: "Technology risk", value: "Transferred to operator" },
    { label: "On-site fuel burned", value: "0 gal (battery electric)" },
  ];

  const qualitativeBenefits = [
    `Cut frequency rises from roughly ${input.currentCutsPerMonth}x per month to ${input.proposedCutsPerWeek}x per week, which is what actually drives turf appearance.`,
    "Near-silent, zero-emission operation during business hours rather than a crew with gas equipment.",
    `Visible crew presence drops from a full mowing crew to roughly ${stabilizedBurden.siteVisitsPerYear.toFixed(0)} technician visits per year.`,
    "One vendor relationship for mowing with centralized reporting rather than crew-schedule management.",
    "No customer capital, no equipment on the customer's balance sheet, no technology obsolescence risk.",
  ];
  if (input.qualitativeNotes.trim()) qualitativeBenefits.push(input.qualitativeNotes.trim());

  const warnings: string[] = [];
  if (priceSource === "cost_floor") {
    warnings.push(
      `The ${selectedApproach.label} price of ${money(selectedApproach.annualPrice)} sits below the ${money(requiredFloorPrice)} cost floor. The quoted price has been raised to the floor — at the target savings level this deal does not clear underwriting.`,
    );
  }
  if (annualCustomerSavings < 0) {
    warnings.push(
      `We are quoting a ${money(-annualCustomerSavings)} premium (${(-savingsPct).toFixed(1)}%) over the replaced incumbent spend. That has to be sold on appearance, noise and vendor risk, not on price.`,
    );
  }
  if (residual.retainedIncumbentMowingSpend > 0) {
    warnings.push(
      `The customer still pays roughly ${money(residual.retainedIncumbentMowingSpend)} for the mowing scope we do not replace, so total spend falls less than the headline savings figure.`,
    );
  }
  if (incumbentMowingOnlyCost <= 0) {
    warnings.push("No incumbent mowing cost has been entered, so customer savings cannot be evaluated.");
  }

  return {
    incumbentMowingOnlyCost,
    replacedIncumbentSpend,
    retainedIncumbentSpend,
    recommendedAnnualPrice,
    requiredFloorPrice,
    priceSource,
    annualCustomerSavings,
    savingsPct,
    impliedPremiumPct: -savingsPct,
    costPerAutonomousAcre: div(recommendedAnnualPrice, autonomousAcres, 0),
    costPerSeason: recommendedAnnualPrice,
    incumbentCostPerAcre: div(incumbentMowingOnlyCost, autonomousAcres, 0),
    incumbentCostPerVisit: div(incumbentMowingOnlyCost, Math.max(1, annualMowingVisits), 0),
    approaches,
    currentState,
    proposedState,
    qualitativeBenefits,
    warnings,
  };
}

function ratingText(rating: number, noun: string): string {
  const words = ["Minimal", "Low", "Moderate", "High", "Significant"];
  return `${words[Math.min(4, Math.max(0, Math.round(rating) - 1))]} ${noun} (${rating}/5)`;
}

function money(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
