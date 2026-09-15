import type { Assumptions } from "@/lib/types";
import type { CapitalResult } from "./capital";
import type { InterventionBurden, InterventionResult } from "./intervention";
import { div } from "./util";

export interface OperatingCostLines {
  monitoringConnectivity: number;
  insurance: number;
  repairs: number;
  consumables: number;
  batteryReserve: number;
  physicalInterventionLabor: number;
  remoteMonitoringLabor: number;
  travel: number;
  storageWinterization: number;
  spareFleetAllocation: number;
  /** Sum of everything above. Excludes capital, deployment, admin and risk. */
  total: number;
}

export interface OperatingCostResult {
  lines: OperatingCostLines;
  fieldLaborHourlyCost: number;
  remoteLaborHourlyCost: number;
  burden: InterventionBurden;
}

/**
 * Recurring direct operating cost for one property-year, excluding capital
 * recovery, deployment amortization, variable administration and termination
 * risk (those are layered in by the economics module so pricing can solve for
 * them independently).
 */
export function computeOperatingCosts(
  intervention: InterventionResult,
  capital: CapitalResult,
  a: Assumptions,
  phase: "stabilized" | "commissioning" = "stabilized",
): OperatingCostResult {
  const burden = phase === "commissioning" ? intervention.commissioningYear : intervention.stabilized;
  const f = a.fleetOpex;
  const live = capital.liveMachines;
  const spares = capital.spareMachines;
  const acquisitionEach = capital.product?.acquisitionCost ?? 0;
  const liveCapital = acquisitionEach * live;
  const spareCapital = acquisitionEach * spares;

  const fieldLaborHourlyCost = a.labor.fieldTechHourlyCost * a.labor.laborBurdenMultiplier;
  const remoteLaborHourlyCost = a.labor.remoteTechHourlyCost * a.labor.laborBurdenMultiplier;

  const bladeCost = intervention.bladeChangesPerMachineYear * f.bladeSetCost * live;

  const lines: OperatingCostLines = {
    monitoringConnectivity: f.monitoringConnectivityPerMachineYear * live,
    insurance: (liveCapital * f.insurancePctOfCapitalPerYear) / 100,
    repairs: (liveCapital * f.repairsPctOfCapitalPerYear) / 100,
    consumables: f.consumablesPerMachineYear * live + bladeCost,
    batteryReserve: (liveCapital * f.batteryReservePctOfCapitalPerYear) / 100,
    physicalInterventionLabor: burden.fieldHoursTotal * fieldLaborHourlyCost,
    remoteMonitoringLabor: burden.remoteHoursTotal * remoteLaborHourlyCost,
    travel: burden.travelHoursTotal * a.labor.travelHourlyCost,
    storageWinterization: f.storageWinterizationPerMachineYear * live,
    // Spares carry insurance, battery reserve, storage and half of monitoring.
    spareFleetAllocation:
      (spareCapital * (f.insurancePctOfCapitalPerYear + f.batteryReservePctOfCapitalPerYear)) / 100 +
      spares * (f.storageWinterizationPerMachineYear + f.monitoringConnectivityPerMachineYear * 0.5),
    total: 0,
  };

  lines.total =
    lines.monitoringConnectivity +
    lines.insurance +
    lines.repairs +
    lines.consumables +
    lines.batteryReserve +
    lines.physicalInterventionLabor +
    lines.remoteMonitoringLabor +
    lines.travel +
    lines.storageWinterization +
    lines.spareFleetAllocation;

  return { lines, fieldLaborHourlyCost, remoteLaborHourlyCost, burden };
}

/** Blended cost of one technician hour at this property, including travel. */
export function costPerTechnicianHour(cost: OperatingCostResult): number {
  const hours = cost.burden.fieldHoursTotal + cost.burden.travelHoursTotal;
  return div(cost.lines.physicalInterventionLabor + cost.lines.travel, hours, 0);
}
