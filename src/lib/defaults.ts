import type {
  InterventionInputs,
  Property,
  ResidualScope,
  ResidualServiceLine,
} from "./types";
import { RESIDUAL_SERVICES } from "./types";

export function defaultResidualLines(): ResidualServiceLine[] {
  return RESIDUAL_SERVICES.map((service) => ({
    service,
    inIncumbentScope: service !== "snow" && service !== "other",
    owner: "existing_landscaper" as const,
    estimatedAnnualCost: 0,
    note: "",
  }));
}

export function defaultResidualScope(): ResidualScope {
  return {
    lines: defaultResidualLines(),
    incumbentMowingScopeReplacedPct: 80,
    landscaperRemainsOnsite: true,
    landscaperCanSupportRobots: false,
    landscaperRole: "residual_landscaping_only",
    notes: "",
  };
}

export function defaultInterventionInputs(): InterventionInputs {
  return {
    useModelPredictedRate: true,
    scheduledVisitsPerMachineYear: 6,
    unplannedPhysicalPerMachineMonth: 1.0,
    remotePerMachineMonth: 2.2,
    avgPhysicalInterventionHours: 0.75,
    avgRemoteInterventionHours: 0.25,
    avgScheduledVisitHours: 1.25,
    avgTravelHours: 0.5,
    bladeServiceIntervalHours: 400,
    commissioningMonths: 3,
    commissioningMultiplier: 2.5,
    expectedUptimePct: 92,
    categoryMix: {
      navigation: 22,
      obstruction: 20,
      debris: 14,
      mechanical: 12,
      charging: 8,
      connectivity: 10,
      vandalism: 4,
      turf_condition: 6,
      other: 4,
    },
  };
}

/** A blank property with sensible, clearly-placeholder starting values. */
export function createEmptyProperty(id: string, now = new Date().toISOString()): Property {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    decisionOverride: null,
    intake: {
      name: "",
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
      propertyType: "industrial",
      owner: "",
      propertyManager: "",
      existingLandscaper: "",
      parcelAcres: 0,
      estimatedTurfAcres: 0,
      existingAnnualLandscapeCost: 0,
      estimatedMowingOnlyCost: 0,
      annualMowingVisits: 26,
      terminationProvision: "unknown",
      contractExpiration: "",
      notes: "",
      gis: {
        measurementSource: "manual",
        parcelId: "",
        aerialImageUrl: "",
        measuredTurfAcres: null,
        lastSyncedAt: null,
        note: "GIS / aerial measurement integration not yet connected. All measurements manual.",
      },
    },
    assessment: {
      geometry: {
        totalTurfAcres: 0,
        contiguousTurfAcres: 0,
        mowingZoneCount: 1,
        largestZoneAcres: 0,
        averageZoneAcres: 0,
        autonomousCompatiblePct: 70,
        turfPerimeterLinearFeet: 0,
        roadCrossings: 0,
        sidewalkCrossings: 0,
        gates: 0,
        narrowPassages: 0,
        curbLinearFeet: 0,
        retainingWalls: 0,
        landscapeBeds: 0,
        trees: 0,
        lightPoles: 0,
        signage: 0,
        drainageStructures: 0,
        waterHazards: 0,
        steepSlopeAreas: 0,
        maxSlopePct: 15,
        irregularTurfAreas: 0,
      },
      ratings: {
        turfFragmentation: 3,
        slopeDifficulty: 3,
        obstacleDensity: 3,
        edgeComplexity: 3,
        groundQuality: 3,
        drainageWetAreas: 3,
        debrisExposure: 3,
        pedestrianInteraction: 3,
        vehicleInteraction: 3,
        vandalismTheftExposure: 3,
        gpsRtkVisibility: 3,
        cellularConnectivity: 3,
        chargingStationSuitability: 3,
      },
      perimeterManualFinishPct: 35,
      requiredFinishQuality: 3,
      assessorNotes: "",
    },
    intervention: defaultInterventionInputs(),
    cluster: {
      distanceToNearestDeploymentMiles: 25,
      machinesWithin5Miles: 0,
      machinesWithin10Miles: 0,
      machinesWithin15Miles: 0,
      machinesWithin25Miles: 0,
      machinesWithin50Miles: 0,
      autonomousAcresInCluster: 0,
      technicianTravelMinutes: 35,
      strategicException: false,
      strategicExceptionRationale: "",
    },
    residual: defaultResidualScope(),
    customerValue: {
      annualMowingOnlyCostOverride: 0,
      currentCutsPerMonth: 4,
      currentCrewVisibilityRating: 3,
      currentComplaintsRating: 2,
      currentNoiseRating: 3,
      currentFuelGallonsPerYear: 0,
      vendorManagementBurdenRating: 3,
      proposedCutsPerWeek: 3,
      expectedAppearanceConsistencyRating: 4,
      pricingApproach: "value",
      customTargetSavingsPct: 10,
      qualitativeNotes: "",
    },
    contract: {
      structure: "full_season",
      customSeasons: 1,
      mechanism: "B_all_inclusive_recurring",
      upfrontDeploymentFeeCoveragePct: 100,
      terminationProbabilityOverridePct: -1,
      notes: "",
    },
    economics: {
      otherServiceRevenue: 0,
      implementationFeeOverride: 0,
      financeEquipment: false,
      annualPriceOverride: 0,
      notes: "",
    },
    equipment: {
      selectedProductIdOverride: "",
      machineCountOverride: 0,
      notes: "",
    },
    diligenceNotes: [],
  };
}

/** Field-level metadata used to render direction-correct 1–5 rating controls. */
export const RATING_SCALES: Record<
  string,
  { label: string; help: string; low: string; high: string }
> = {
  turfFragmentation: {
    label: "Turf fragmentation",
    help: "How broken up the turf is into separate islands.",
    low: "Highly fragmented",
    high: "Single contiguous area",
  },
  slopeDifficulty: {
    label: "Slope difficulty",
    help: "Severity and extent of grades on mowable turf.",
    low: "Severe slopes",
    high: "Essentially flat",
  },
  obstacleDensity: {
    label: "Obstacle density",
    help: "Fixed objects the machine must navigate around.",
    low: "Very dense",
    high: "Open turf",
  },
  edgeComplexity: {
    label: "Edge complexity",
    help: "Shape and finish demands of turf boundaries.",
    low: "Highly irregular edges",
    high: "Simple, clean edges",
  },
  groundQuality: {
    label: "Ground quality",
    help: "Surface smoothness, ruts, holes and turf density.",
    low: "Rough / rutted",
    high: "Smooth, dense turf",
  },
  drainageWetAreas: {
    label: "Drainage / wet areas",
    help: "How well the site drains after rain.",
    low: "Chronic wet areas",
    high: "Drains quickly",
  },
  debrisExposure: {
    label: "Debris exposure",
    help: "Sticks, litter, nuts, cones and other objects on turf.",
    low: "Heavy debris",
    high: "Minimal debris",
  },
  pedestrianInteraction: {
    label: "Pedestrian interaction",
    help: "How much foot traffic crosses the mowing zones.",
    low: "Constant foot traffic",
    high: "Little or none",
  },
  vehicleInteraction: {
    label: "Vehicle interaction",
    help: "Traffic, deliveries and parking movement near turf.",
    low: "Heavy vehicle activity",
    high: "Minimal vehicle activity",
  },
  vandalismTheftExposure: {
    label: "Vandalism / theft exposure",
    help: "Risk to a leave-behind asset, including after hours.",
    low: "High exposure",
    high: "Secure / controlled site",
  },
  gpsRtkVisibility: {
    label: "GPS / RTK visibility",
    help: "Sky view for satellite localization; buildings and canopy block it.",
    low: "Heavily obstructed",
    high: "Wide open sky",
  },
  cellularConnectivity: {
    label: "Cellular connectivity",
    help: "Carrier signal strength for telemetry and remote support.",
    low: "Little or no signal",
    high: "Strong signal",
  },
  chargingStationSuitability: {
    label: "Charging-station suitability",
    help: "Power availability, protected location and proximity to turf.",
    low: "No viable location",
    high: "Ideal location and power",
  },
};
