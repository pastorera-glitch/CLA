import type { Assumptions, EconomicsInputs } from "@/lib/types";
import type { CapitalResult } from "./capital";
import type { ContractOption } from "./contract";
import type { InterventionResult } from "./intervention";
import type { OperatingCostResult } from "./opex";
import { div } from "./util";

export interface PnlLine {
  key: string;
  label: string;
  amount: number;
  /** Short explanation of how the line is derived. */
  basis: string;
}

export interface EconomicsResult {
  revenue: {
    roboticMowingService: number;
    implementationFee: number;
    otherServiceRevenue: number;
    total: number;
    lines: PnlLine[];
  };
  cost: {
    lines: PnlLine[];
    total: number;
  };
  contribution: number;
  contributionMarginPct: number;
  contributionPerAutonomousAcre: number;
  contributionPerMachine: number;
  contributionPerTechnicianHour: number;

  upfrontOperatorCapital: number;
  paybackYears: number | null;
  breakEvenDate: string | null;

  commissioningYearContribution: number;
  commissioningYearMarginPct: number;

  /** 'target' | 'conditional' | 'watch' against the editable thresholds. */
  underwritingVerdict: "target" | "conditional" | "watch";
  verdictNarrative: string;
  totalTechnicianHours: number;
}

export function computeEconomics(
  contractOption: ContractOption,
  stabilizedCost: OperatingCostResult,
  commissioningCost: OperatingCostResult,
  capital: CapitalResult,
  intervention: InterventionResult,
  economicsInputs: EconomicsInputs,
  annualPrice: number,
  autonomousAcres: number,
  a: Assumptions,
): EconomicsResult {
  const implementationFee =
    economicsInputs.implementationFeeOverride > 0
      ? economicsInputs.implementationFeeOverride
      : contractOption.upfrontCustomerFee;

  // The upfront fee is recognized across the committed term so the annual P&L
  // is comparable between structures.
  const amortizedImplementationFee = div(
    implementationFee,
    Math.max(0.5, contractOption.committedSeasons),
    implementationFee,
  );

  const roboticMowingService = annualPrice;
  const otherServiceRevenue = Math.max(0, economicsInputs.otherServiceRevenue);
  const totalRevenue = roboticMowingService + amortizedImplementationFee + otherServiceRevenue;

  const revenueLines: PnlLine[] = [
    {
      key: "robotic_service",
      label: "Robotic mowing service",
      amount: roboticMowingService,
      basis: "Recurring annual service fee.",
    },
    {
      key: "implementation_fee",
      label: "Implementation fee (amortized)",
      amount: amortizedImplementationFee,
      basis: `${money(implementationFee)} upfront recognized over ${contractOption.committedSeasons} season(s).`,
    },
    {
      key: "other_revenue",
      label: "Other service revenue",
      amount: otherServiceRevenue,
      basis: "Optional add-on revenue booked at this property.",
    },
  ];

  const l = stabilizedCost.lines;
  const variableAdmin = (totalRevenue * a.fleetOpex.variableAdminPctOfRevenue) / 100;

  const costLines: PnlLine[] = [
    {
      key: "machine_economic",
      label: "Machine annual economic cost",
      amount: capital.machineAnnualEconomicCost,
      basis: `(${money(capital.fleetAcquisitionCost)} fleet cost − ${money(capital.pvFleetResidualValue)} PV of salvage) amortized at ${a.capital.costOfCapitalPct}% over ${capital.usefulLifeYears} yr.`,
    },
    {
      key: "financing",
      label: "Financing / lease cost",
      amount: capital.financingAnnualCost,
      basis: economicsInputs.financeEquipment
        ? `Spread of the ${a.capital.financeApr}% / ${a.capital.financeTermYears}-yr lease payment over the economic cost above.`
        : "Fleet purchased with cash — no financing spread.",
    },
    {
      key: "deployment",
      label: "Deployment / commissioning",
      amount: contractOption.deploymentRecoveryAnnual,
      basis: `${money(capital.deployment.total)} deployment cost recovered over ${contractOption.deploymentRecoveryYears.toFixed(2)} yr under this structure.`,
    },
    {
      key: "monitoring",
      label: "Monitoring / connectivity",
      amount: l.monitoringConnectivity,
      basis: `${money(a.fleetOpex.monitoringConnectivityPerMachineYear)} per live machine per year.`,
    },
    {
      key: "insurance",
      label: "Insurance",
      amount: l.insurance,
      basis: `${a.fleetOpex.insurancePctOfCapitalPerYear}% of deployed machine capital.`,
    },
    {
      key: "repairs",
      label: "Repairs",
      amount: l.repairs,
      basis: `${a.fleetOpex.repairsPctOfCapitalPerYear}% of deployed machine capital.`,
    },
    {
      key: "consumables",
      label: "Consumables (incl. blades)",
      amount: l.consumables,
      basis: `${money(a.fleetOpex.consumablesPerMachineYear)}/machine plus ${intervention.bladeChangesPerMachineYear.toFixed(1)} blade sets per machine at ${money(a.fleetOpex.bladeSetCost)}.`,
    },
    {
      key: "battery",
      label: "Battery / replacement reserve",
      amount: l.batteryReserve,
      basis: `${a.fleetOpex.batteryReservePctOfCapitalPerYear}% of deployed machine capital reserved annually.`,
    },
    {
      key: "field_labor",
      label: "Physical intervention labor",
      amount: l.physicalInterventionLabor,
      basis: `${stabilizedCost.burden.fieldHoursTotal.toFixed(1)} field hours at ${money(stabilizedCost.fieldLaborHourlyCost)}/hr burdened.`,
    },
    {
      key: "remote_labor",
      label: "Remote monitoring labor",
      amount: l.remoteMonitoringLabor,
      basis: `${stabilizedCost.burden.remoteHoursTotal.toFixed(1)} remote hours at ${money(stabilizedCost.remoteLaborHourlyCost)}/hr burdened.`,
    },
    {
      key: "travel",
      label: "Travel",
      amount: l.travel,
      basis: `${stabilizedCost.burden.travelHoursTotal.toFixed(1)} round-trip hours across ${stabilizedCost.burden.siteVisitsPerYear.toFixed(1)} dispatches at ${money(a.labor.travelHourlyCost)}/hr.`,
    },
    {
      key: "storage",
      label: "Storage / winterization",
      amount: l.storageWinterization,
      basis: `${money(a.fleetOpex.storageWinterizationPerMachineYear)} per live machine per off-season.`,
    },
    {
      key: "spares",
      label: "Spare-fleet allocation",
      amount: l.spareFleetAllocation,
      basis: `${capital.spareMachines} spare machine(s) carrying insurance, battery reserve, storage and half monitoring.`,
    },
    {
      key: "admin",
      label: "Variable administration",
      amount: variableAdmin,
      basis: `${a.fleetOpex.variableAdminPctOfRevenue}% of property revenue.`,
    },
    {
      key: "termination_risk",
      label: "Expected redeployment / termination risk",
      amount: contractOption.contractFlexibilityPremiumAnnual,
      basis: `${contractOption.terminationProbabilityPct}% termination probability x ${money(contractOption.expectedUnrecoveredCapital)} expected unrecovered capital, annualized.`,
    },
  ];

  const totalCost = costLines.reduce((s, c) => s + c.amount, 0);
  const contribution = totalRevenue - totalCost;
  const contributionMarginPct = div(contribution, totalRevenue, 0) * 100;

  const totalTechnicianHours = stabilizedCost.burden.fieldHoursTotal + stabilizedCost.burden.travelHoursTotal;

  // Commissioning year: higher intervention load, same revenue.
  const commissioningDelta = commissioningCost.lines.total - stabilizedCost.lines.total;
  const commissioningYearContribution = contribution - commissioningDelta;
  const commissioningYearMarginPct = div(commissioningYearContribution, totalRevenue, 0) * 100;

  const upfrontOperatorCapital = Math.max(0, capital.upfrontOperatorCapital - implementationFee);
  const paybackYears = contribution > 0 ? upfrontOperatorCapital / contribution : null;

  const t = a.thresholds;
  const underwritingVerdict: EconomicsResult["underwritingVerdict"] =
    contributionMarginPct >= t.targetContributionMarginPct
      ? "target"
      : contributionMarginPct >= t.conditionalContributionMarginPct
        ? "conditional"
        : "watch";

  const verdictNarrative =
    underwritingVerdict === "target"
      ? `Steady-state contribution margin of ${contributionMarginPct.toFixed(1)}% clears the ${t.targetContributionMarginPct}% target.`
      : underwritingVerdict === "conditional"
        ? `Contribution margin of ${contributionMarginPct.toFixed(1)}% falls in the ${t.conditionalContributionMarginPct}–${t.targetContributionMarginPct}% conditional band. Acceptable only where cluster density or strategic portfolio value is strong.`
        : `Contribution margin of ${contributionMarginPct.toFixed(1)}% is below the ${t.rejectContributionMarginPct}% floor. Generally reject unless the pricing or machine count changes materially.`;

  return {
    revenue: {
      roboticMowingService,
      implementationFee: amortizedImplementationFee,
      otherServiceRevenue,
      total: totalRevenue,
      lines: revenueLines,
    },
    cost: { lines: costLines, total: totalCost },
    contribution,
    contributionMarginPct,
    contributionPerAutonomousAcre: div(contribution, autonomousAcres, 0),
    contributionPerMachine: div(contribution, capital.liveMachines, 0),
    contributionPerTechnicianHour: div(contribution, totalTechnicianHours, 0),
    upfrontOperatorCapital,
    paybackYears,
    breakEvenDate: paybackYears !== null ? breakEvenDate(paybackYears, a) : null,
    commissioningYearContribution,
    commissioningYearMarginPct,
    underwritingVerdict,
    verdictNarrative,
    totalTechnicianHours,
  };
}

/**
 * Break-even date assuming contribution accrues only during the mowing season,
 * which starts in the configured season-start month of the current year.
 */
function breakEvenDate(paybackYears: number, a: Assumptions): string {
  const start = new Date();
  start.setMonth(a.season.seasonStartMonth - 1, 1);
  const seasonFrac = a.season.mowingSeasonWeeks / 52;
  const calendarYears = seasonFrac > 0 ? paybackYears / seasonFrac : paybackYears;
  const result = new Date(start.getTime());
  result.setDate(result.getDate() + Math.round(calendarYears * 365));
  return result.toISOString().slice(0, 10);
}

function money(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
