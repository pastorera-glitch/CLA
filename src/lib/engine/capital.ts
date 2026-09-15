import type { Assumptions, EconomicsInputs, MowerProduct, SiteAssessment } from "@/lib/types";
import { annualLoanPayment, capitalRecoveryFactor, presentValue } from "./util";

export interface CapitalResult {
  product: MowerProduct | null;
  liveMachines: number;
  spareMachines: number;
  totalMachines: number;

  fleetAcquisitionCost: number;
  /** Nominal salvage value of the fleet at the end of useful life. */
  fleetResidualValue: number;
  pvFleetResidualValue: number;
  usefulLifeYears: number;

  deployment: {
    surveyLabor: number;
    commissioningLabor: number;
    zoneMappingLabor: number;
    crossingMappingLabor: number;
    installMaterials: number;
    chargingStations: number;
    rtkBaseStation: number;
    mobilization: number;
    total: number;
    totalHours: number;
  };

  /** Economic cost of owning one year of fleet: depreciation + capital charge. */
  machineAnnualEconomicCost: number;
  /** Incremental annual cost of financing/leasing instead of paying cash. Zero when paying cash. */
  financingAnnualCost: number;
  /** Cash the operator must put up before the first invoice. */
  upfrontOperatorCapital: number;
}

/** Fleet capital and one-time deployment cost for a property. */
export function computeCapital(
  product: MowerProduct | null,
  liveMachines: number,
  spareMachines: number,
  assessment: SiteAssessment,
  economics: EconomicsInputs,
  a: Assumptions,
): CapitalResult {
  const totalMachines = liveMachines + spareMachines;
  const acquisitionEach = product?.acquisitionCost ?? 0;
  const usefulLifeYears = product?.usefulLifeYears ?? a.capital.defaultUsefulLifeYears;
  const fleetAcquisitionCost = acquisitionEach * totalMachines;
  const fleetResidualValue = (fleetAcquisitionCost * (product?.residualValuePct ?? 10)) / 100;
  const pvFleetResidualValue = presentValue(fleetResidualValue, a.capital.costOfCapitalPct, usefulLifeYears);

  const techHourly = a.labor.fieldTechHourlyCost * a.labor.laborBurdenMultiplier;
  const g = assessment.geometry;
  const d = a.deployment;

  // Spares are not commissioned on site; only live machines are mapped and set up.
  const commissioningHours = d.commissioningHoursPerMachine * liveMachines;
  const zoneHours = Math.max(0, g.mowingZoneCount - 1) * d.hoursPerAdditionalZone;
  const crossingHours = (g.roadCrossings + g.sidewalkCrossings) * d.hoursPerCrossing;
  const totalHours = d.siteSurveyHours + commissioningHours + zoneHours + crossingHours;

  const deployment = {
    surveyLabor: d.siteSurveyHours * techHourly,
    commissioningLabor: commissioningHours * techHourly,
    zoneMappingLabor: zoneHours * techHourly,
    crossingMappingLabor: crossingHours * techHourly,
    installMaterials: d.installMaterialsPerMachine * liveMachines,
    chargingStations: d.chargingStationCost * liveMachines,
    rtkBaseStation: product?.requiresRtk ? d.rtkBaseStationCost : 0,
    mobilization: d.mobilizationCost,
    total: 0,
    totalHours,
  };
  deployment.total =
    deployment.surveyLabor +
    deployment.commissioningLabor +
    deployment.zoneMappingLabor +
    deployment.crossingMappingLabor +
    deployment.installMaterials +
    deployment.chargingStations +
    deployment.rtkBaseStation +
    deployment.mobilization;

  // Annual economic cost of the fleet: amortize (cost - PV of salvage) at the
  // cost of capital over the machine's useful life.
  const machineAnnualEconomicCost =
    (fleetAcquisitionCost - pvFleetResidualValue) * capitalRecoveryFactor(a.capital.costOfCapitalPct, usefulLifeYears);

  // Financing is shown as the SPREAD over the economic cost, so the two lines
  // never double-count the same capital.
  const leasePayment = economics.financeEquipment
    ? annualLoanPayment(fleetAcquisitionCost, a.capital.financeApr, a.capital.financeTermYears)
    : 0;
  const financingAnnualCost = economics.financeEquipment
    ? Math.max(0, leasePayment - machineAnnualEconomicCost)
    : 0;

  const upfrontOperatorCapital = economics.financeEquipment
    ? deployment.total
    : deployment.total + fleetAcquisitionCost;

  return {
    product,
    liveMachines,
    spareMachines,
    totalMachines,
    fleetAcquisitionCost,
    fleetResidualValue,
    pvFleetResidualValue,
    usefulLifeYears,
    deployment,
    machineAnnualEconomicCost,
    financingAnnualCost,
    upfrontOperatorCapital,
  };
}
