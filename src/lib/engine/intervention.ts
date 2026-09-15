import type { Assumptions, InterventionCategory, InterventionInputs } from "@/lib/types";
import { INTERVENTION_CATEGORIES, INTERVENTION_CATEGORY_LABELS } from "@/lib/types";
import { clamp, div, normalizeShares } from "./util";

export interface InterventionCategoryBreakdown {
  category: InterventionCategory;
  label: string;
  sharePct: number;
  physicalPerMachineYear: number;
  remotePerMachineYear: number;
}

export interface InterventionResult {
  /** Multiplier applied to the baseline rate because of the site's readiness score. */
  readinessMultiplier: number;
  modelPredictedPhysicalPerMachineMonth: number;
  modelPredictedRemotePerMachineMonth: number;
  /** Rates actually used (model or manual override). */
  physicalPerMachineMonth: number;
  remotePerMachineMonth: number;
  usingModel: boolean;

  stabilized: InterventionBurden;
  commissioningYear: InterventionBurden;

  bladeChangesPerMachineYear: number;
  machineOperatingHoursPerYear: number;
  categories: InterventionCategoryBreakdown[];
  notes: string[];
}

export interface InterventionBurden {
  label: string;
  physicalInterventionsPerMachineYear: number;
  remoteInterventionsPerMachineYear: number;
  scheduledVisitsPerMachineYear: number;
  /** Trips to site for the whole fleet at this property. */
  siteVisitsPerYear: number;
  fieldHoursPerMachineYear: number;
  fieldHoursTotal: number;
  remoteHoursPerMachineYear: number;
  remoteHoursTotal: number;
  travelHoursTotal: number;
  totalHumanHours: number;
}

/**
 * Human-in-the-loop model.
 *
 * Deliberately a small, readable formula rather than an opaque prediction:
 *   rate = baseline x readinessMultiplier
 *   readinessMultiplier = 1 + sensitivity x (referenceScore - readinessScore) / 25
 * clamped to the configured min/max. A better site therefore produces a lower
 * expected intervention rate, and the operator can see exactly why.
 */
export function computeIntervention(
  input: InterventionInputs,
  readinessScore: number,
  liveMachines: number,
  totalMachines: number,
  machineOperatingHoursPerYear: number,
  a: Assumptions,
): InterventionResult {
  const m = a.interventionModel;

  const readinessMultiplier = clamp(
    1 + m.readinessSensitivity * ((m.referenceReadinessScore - readinessScore) / 25),
    m.minMultiplier,
    m.maxMultiplier,
  );

  const modelPredictedPhysicalPerMachineMonth = m.baselinePhysicalPerMachineMonth * readinessMultiplier;
  const modelPredictedRemotePerMachineMonth = m.baselineRemotePerMachineMonth * readinessMultiplier;

  const usingModel = input.useModelPredictedRate;
  const physicalPerMachineMonth = usingModel
    ? modelPredictedPhysicalPerMachineMonth
    : Math.max(0, input.unplannedPhysicalPerMachineMonth);
  const remotePerMachineMonth = usingModel
    ? modelPredictedRemotePerMachineMonth
    : Math.max(0, input.remotePerMachineMonth);

  // Downtime raises the effective intervention load: a machine that is only up
  // 92% of the time is producing an availability gap somebody has to close.
  const uptimeFrac = clamp(input.expectedUptimePct / 100, 0.5, 1);
  const uptimeLoadFactor = 1 + (1 - uptimeFrac) * 1.5;

  const bladeChangesPerMachineYear =
    input.bladeServiceIntervalHours > 0 ? machineOperatingHoursPerYear / input.bladeServiceIntervalHours : 0;

  // Scheduled visits: whichever is greater, the operator's planned cadence or
  // the cadence the blade interval forces.
  const scheduledPerMachineYear = Math.max(input.scheduledVisitsPerMachineYear, bladeChangesPerMachineYear);

  const stabilized = burden(
    "Stabilized (steady state)",
    physicalPerMachineMonth * 12 * uptimeLoadFactor,
    remotePerMachineMonth * 12 * uptimeLoadFactor,
    scheduledPerMachineYear,
    input,
    liveMachines,
    totalMachines,
    a,
  );

  // Commissioning year: the multiplier applies for commissioningMonths, normal rate after.
  const commMonths = clamp(input.commissioningMonths, 0, 12);
  const blendFactor =
    (commMonths * input.commissioningMultiplier + (12 - commMonths) * 1) / 12;

  const commissioningYear = burden(
    "Commissioning year",
    physicalPerMachineMonth * 12 * uptimeLoadFactor * blendFactor,
    remotePerMachineMonth * 12 * uptimeLoadFactor * blendFactor,
    scheduledPerMachineYear,
    input,
    liveMachines,
    totalMachines,
    a,
  );

  const mix = normalizeShares(input.categoryMix);
  const categories: InterventionCategoryBreakdown[] = INTERVENTION_CATEGORIES.map((c) => ({
    category: c,
    label: INTERVENTION_CATEGORY_LABELS[c],
    sharePct: mix[c],
    physicalPerMachineYear: (stabilized.physicalInterventionsPerMachineYear * mix[c]) / 100,
    remotePerMachineYear: (stabilized.remoteInterventionsPerMachineYear * mix[c]) / 100,
  }));

  const notes: string[] = [
    `Readiness score ${readinessScore.toFixed(0)} against a reference of ${m.referenceReadinessScore} produces a x${readinessMultiplier.toFixed(2)} intervention multiplier at a sensitivity of ${m.readinessSensitivity} per 25 points.`,
    `Expected uptime of ${input.expectedUptimePct}% adds a x${uptimeLoadFactor.toFixed(2)} load factor.`,
    usingModel
      ? "Rates are model-predicted from the readiness score. Switch to manual entry once real field data exists for this site type."
      : "Rates are manually entered and override the readiness-driven model.",
    `Blade/service interval of ${input.bladeServiceIntervalHours} operating hours implies ${bladeChangesPerMachineYear.toFixed(1)} service events per machine per season.`,
  ];

  return {
    readinessMultiplier,
    modelPredictedPhysicalPerMachineMonth,
    modelPredictedRemotePerMachineMonth,
    physicalPerMachineMonth,
    remotePerMachineMonth,
    usingModel,
    stabilized,
    commissioningYear,
    bladeChangesPerMachineYear,
    machineOperatingHoursPerYear,
    categories,
    notes,
  };
}

function burden(
  label: string,
  physicalPerMachineYear: number,
  remotePerMachineYear: number,
  scheduledPerMachineYear: number,
  input: InterventionInputs,
  liveMachines: number,
  totalMachines: number,
  a: Assumptions,
): InterventionBurden {
  const fieldHoursPerMachineYear =
    physicalPerMachineYear * input.avgPhysicalInterventionHours +
    scheduledPerMachineYear * input.avgScheduledVisitHours;

  const remoteHoursPerMachineYear = remotePerMachineYear * input.avgRemoteInterventionHours;

  // Machines at one property are serviced on the same trip, so site visits scale
  // with the fleet but sub-linearly via the batching factor.
  const unplannedTrips = physicalPerMachineYear * liveMachines * a.labor.tripBatchingFactor;
  // Scheduled service is a routed visit that covers every machine at the property,
  // so the trip count does not scale with fleet size — only the on-site hours do.
  const scheduledTrips = scheduledPerMachineYear;
  const siteVisitsPerYear = unplannedTrips + scheduledTrips;

  // avgTravelHours is one-way; every dispatch is a round trip.
  const travelHoursTotal = siteVisitsPerYear * input.avgTravelHours * 2;

  const fieldHoursTotal = fieldHoursPerMachineYear * liveMachines;
  const remoteHoursTotal = remoteHoursPerMachineYear * totalMachines;

  return {
    label,
    physicalInterventionsPerMachineYear: physicalPerMachineYear,
    remoteInterventionsPerMachineYear: remotePerMachineYear,
    scheduledVisitsPerMachineYear: scheduledPerMachineYear,
    siteVisitsPerYear,
    fieldHoursPerMachineYear,
    fieldHoursTotal,
    remoteHoursPerMachineYear,
    remoteHoursTotal,
    travelHoursTotal,
    totalHumanHours: fieldHoursTotal + remoteHoursTotal + travelHoursTotal,
  };
}

/** Interventions per machine-month implied by a given annual hour budget. Used in sensitivity views. */
export function ratePerMachineMonthFromHours(
  hoursPerMachineYear: number,
  avgHoursPerIntervention: number,
): number {
  return div(hoursPerMachineYear, avgHoursPerIntervention * 12, 0);
}
