import type { Assumptions } from "./types";

/**
 * Central, editable assumption set. Nothing in the calculation engine reads a
 * constant that is not defined here. Everything below is a starting estimate
 * for the MVP and should be replaced with verified operating data.
 */
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  readinessWeights: {
    autonomousTurfCompatibility: 25,
    turfGeometry: 15,
    obstaclesCrossings: 10,
    connectivityLocalization: 10,
    terrainSlopeDrainage: 10,
    publicInteractionSecurity: 10,
    chargingInfrastructure: 5,
    residualManualFinishing: 5,
    geographicCluster: 10,
  },
  readinessBands: {
    strongMin: 85,
    candidateMin: 70,
    conditionalMin: 55,
  },
  labor: {
    fieldTechHourlyCost: 28,
    remoteTechHourlyCost: 32,
    laborBurdenMultiplier: 1.35,
    travelHourlyCost: 46,
    tripBatchingFactor: 0.55,
  },
  capital: {
    costOfCapitalPct: 10,
    financeTermYears: 4,
    financeApr: 11,
    defaultUsefulLifeYears: 5,
    redeploymentCostPerMachine: 1800,
    redeploymentIdleMonths: 4,
  },
  fleetOpex: {
    monitoringConnectivityPerMachineYear: 300,
    insurancePctOfCapitalPerYear: 1.5,
    repairsPctOfCapitalPerYear: 5,
    consumablesPerMachineYear: 260,
    bladeSetCost: 45,
    batteryReservePctOfCapitalPerYear: 2.5,
    storageWinterizationPerMachineYear: 180,
    spareRatio: 0.12,
    minSparesThresholdMachines: 3,
    variableAdminPctOfRevenue: 4,
  },
  deployment: {
    siteSurveyHours: 5,
    commissioningHoursPerMachine: 6,
    installMaterialsPerMachine: 300,
    chargingStationCost: 900,
    rtkBaseStationCost: 2600,
    mobilizationCost: 900,
    hoursPerAdditionalZone: 1.5,
    hoursPerCrossing: 2,
  },
  season: {
    mowingSeasonWeeks: 30,
    operatingDaysPerWeek: 6,
    operatingHoursPerDay: 12,
    seasonStartMonth: 4,
  },
  interventionModel: {
    baselinePhysicalPerMachineMonth: 1.0,
    baselineRemotePerMachineMonth: 2.2,
    referenceReadinessScore: 75,
    readinessSensitivity: 0.45,
    minMultiplier: 0.45,
    maxMultiplier: 2.6,
  },
  pricing: {
    valueSavingsPct: 7.5,
    volumeSwitcherSavingsPct: 17.5,
    premiumPilotSavingsPct: -5,
    terminationProbabilityPct: {
      half_season_pilot: 45,
      full_season: 25,
      two_season: 15,
      three_season: 10,
      thirty_day_cancellable: 40,
      custom: 20,
    },
    shortTermRateUpliftPct: 18,
    earlyTerminationChargeCollectibilityPct: 70,
    multiSeasonDiscountPctPerSeason: 4,
    maxMultiSeasonDiscountPct: 10,
  },
  thresholds: {
    targetContributionMarginPct: 35,
    conditionalContributionMarginPct: 25,
    rejectContributionMarginPct: 25,
    targetPaybackYears: 2.5,
    maxAcceptablePremiumPct: 10,
    minMachineUtilizationPct: 55,
    maxMachineUtilizationPct: 92,
  },
  cluster: {
    denseDistanceMiles: 10,
    isolatedDistanceMiles: 35,
    denseMachineCount: 25,
    buildingMachineCount: 8,
    radiusWeights: { r5: 0.4, r10: 0.25, r15: 0.15, r25: 0.12, r50: 0.08 },
    denseScoreMin: 75,
    buildingScoreMin: 50,
  },
};

/** Deep clone so callers never mutate the shared default object. */
export function cloneAssumptions(a: Assumptions): Assumptions {
  return JSON.parse(JSON.stringify(a)) as Assumptions;
}

/**
 * Merge a persisted (possibly older / partial) assumption blob onto the current
 * defaults so that adding a new assumption never breaks a stored record.
 */
export function mergeAssumptions(stored: unknown): Assumptions {
  const base = cloneAssumptions(DEFAULT_ASSUMPTIONS);
  if (!stored || typeof stored !== "object") return base;
  deepMerge(base as unknown as Record<string, unknown>, stored as Record<string, unknown>);
  return base;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>) {
  for (const [key, value] of Object.entries(source)) {
    if (value === null || value === undefined) continue;
    const current = target[key];
    if (isPlainObject(value) && isPlainObject(current)) {
      deepMerge(current, value);
    } else if (!isPlainObject(value)) {
      target[key] = value;
    }
  }
  return target;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
