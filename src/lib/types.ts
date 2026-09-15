/**
 * Core domain model for the commercial robotic mowing underwriting platform.
 *
 * Conventions used throughout:
 *  - All monetary values are USD, nominal, annual unless the field name says otherwise.
 *  - All area values are ACRES.
 *  - All qualitative ratings are 1..5 where **5 is always the most favorable condition
 *    for autonomous mowing** and 1 is the least favorable. Field labels in the UI are
 *    written so the operator reads the direction correctly (e.g. "Slope difficulty"
 *    is presented as "Slope favorability").
 *  - All percentages are 0..100 numbers (not 0..1 fractions) when they are user inputs.
 *    Internal engine rates that are fractions are suffixed `Frac`.
 */

export type Iso8601Date = string;

/* ------------------------------------------------------------------ */
/* Enumerations                                                        */
/* ------------------------------------------------------------------ */

export const PROPERTY_TYPES = [
  "industrial",
  "office_campus",
  "multifamily",
  "dealership",
  "school",
  "church",
  "cemetery",
  "retail",
  "municipal",
  "healthcare",
  "hospitality",
  "self_storage",
  "data_center",
  "other",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  industrial: "Industrial / Logistics",
  office_campus: "Office Campus",
  multifamily: "Multifamily",
  dealership: "Auto Dealership",
  school: "School / Education",
  church: "Church / Religious",
  cemetery: "Cemetery",
  retail: "Retail / Shopping Center",
  municipal: "Municipal / Public",
  healthcare: "Healthcare / Medical",
  hospitality: "Hospitality",
  self_storage: "Self Storage",
  data_center: "Data Center",
  other: "Other",
};

export const TERMINATION_PROVISIONS = [
  "thirty_day_convenience",
  "sixty_day_convenience",
  "ninety_day_convenience",
  "term_no_convenience",
  "evergreen_annual",
  "month_to_month",
  "unknown",
] as const;
export type TerminationProvision = (typeof TERMINATION_PROVISIONS)[number];

export const TERMINATION_PROVISION_LABELS: Record<TerminationProvision, string> = {
  thirty_day_convenience: "30-day termination for convenience",
  sixty_day_convenience: "60-day termination for convenience",
  ninety_day_convenience: "90-day termination for convenience",
  term_no_convenience: "Fixed term, no convenience termination",
  evergreen_annual: "Evergreen, annual renewal",
  month_to_month: "Month-to-month",
  unknown: "Unknown / not yet diligenced",
};

export const INTERVENTION_CATEGORIES = [
  "navigation",
  "obstruction",
  "debris",
  "mechanical",
  "charging",
  "connectivity",
  "vandalism",
  "turf_condition",
  "other",
] as const;
export type InterventionCategory = (typeof INTERVENTION_CATEGORIES)[number];

export const INTERVENTION_CATEGORY_LABELS: Record<InterventionCategory, string> = {
  navigation: "Navigation / localization",
  obstruction: "Physical obstruction",
  debris: "Debris / environmental",
  mechanical: "Mechanical",
  charging: "Charging",
  connectivity: "Connectivity / software",
  vandalism: "Vandalism / theft",
  turf_condition: "Turf / site condition",
  other: "Unknown / other",
};

export const READINESS_CATEGORIES = [
  "autonomousTurfCompatibility",
  "turfGeometry",
  "obstaclesCrossings",
  "connectivityLocalization",
  "terrainSlopeDrainage",
  "publicInteractionSecurity",
  "chargingInfrastructure",
  "residualManualFinishing",
  "geographicCluster",
] as const;
export type ReadinessCategory = (typeof READINESS_CATEGORIES)[number];

export const READINESS_CATEGORY_LABELS: Record<ReadinessCategory, string> = {
  autonomousTurfCompatibility: "Autonomous turf compatibility",
  turfGeometry: "Turf geometry / fragmentation",
  obstaclesCrossings: "Obstacles and crossings",
  connectivityLocalization: "Connectivity / localization",
  terrainSlopeDrainage: "Terrain / slope / drainage",
  publicInteractionSecurity: "Public interaction / security",
  chargingInfrastructure: "Charging / infrastructure suitability",
  residualManualFinishing: "Residual manual finishing requirement",
  geographicCluster: "Geographic cluster / service density",
};

export const RESIDUAL_SERVICES = [
  "string_trimming",
  "edging",
  "beds",
  "pruning",
  "fertilizer",
  "weed_control",
  "irrigation",
  "cleanup",
  "leaf_removal",
  "seasonal_color",
  "snow",
  "other",
] as const;
export type ResidualService = (typeof RESIDUAL_SERVICES)[number];

export const RESIDUAL_SERVICE_LABELS: Record<ResidualService, string> = {
  string_trimming: "String trimming",
  edging: "Edging",
  beds: "Landscape beds",
  pruning: "Pruning",
  fertilizer: "Fertilizer",
  weed_control: "Weed control",
  irrigation: "Irrigation",
  cleanup: "Site cleanup",
  leaf_removal: "Leaf removal",
  seasonal_color: "Seasonal services / color",
  snow: "Snow",
  other: "Other",
};

export type ResidualOwner =
  | "existing_landscaper"
  | "operator"
  | "owner_self_perform"
  | "other_vendor"
  | "not_required";

export const RESIDUAL_OWNER_LABELS: Record<ResidualOwner, string> = {
  existing_landscaper: "Existing landscaper",
  operator: "Us (out of base scope)",
  owner_self_perform: "Owner self-performs",
  other_vendor: "Other vendor",
  not_required: "Not required",
};

export type LandscaperRole =
  | "none"
  | "residual_landscaping_only"
  | "residual_plus_robot_support"
  | "robot_support_subcontractor"
  | "displaced";

export const LANDSCAPER_ROLE_LABELS: Record<LandscaperRole, string> = {
  none: "No defined role",
  residual_landscaping_only: "Residual landscaping only",
  residual_plus_robot_support: "Residual landscaping + robot support tasks",
  robot_support_subcontractor: "Robot support subcontractor",
  displaced: "Displaced from site",
};

export const PRICING_APPROACHES = ["value", "volume_switcher", "premium_pilot", "custom"] as const;
export type PricingApproach = (typeof PRICING_APPROACHES)[number];

export const PRICING_APPROACH_LABELS: Record<PricingApproach, string> = {
  value: "Value pricing (near parity, 5–10% savings)",
  volume_switcher: "Volume / switcher pricing (15–20% savings)",
  premium_pilot: "Premium pilot pricing",
  custom: "Custom pricing",
};

export const CONTRACT_STRUCTURES = [
  "half_season_pilot",
  "full_season",
  "two_season",
  "three_season",
  "thirty_day_cancellable",
  "custom",
] as const;
export type ContractStructure = (typeof CONTRACT_STRUCTURES)[number];

export const CONTRACT_STRUCTURE_LABELS: Record<ContractStructure, string> = {
  half_season_pilot: "Half-season pilot",
  full_season: "Full mowing season",
  two_season: "Two-season commitment",
  three_season: "Three-season commitment",
  thirty_day_cancellable: "30-day cancellable",
  custom: "Custom term",
};

/** Capital-risk recovery mechanisms A–F. None is hardcoded as "correct". */
export const PRICING_MECHANISMS = [
  "A_upfront_deployment_fee",
  "B_all_inclusive_recurring",
  "C_higher_short_term_rate",
  "D_multi_season_discount",
  "E_early_termination_charge",
  "F_probabilistic_risk_pricing",
] as const;
export type PricingMechanism = (typeof PRICING_MECHANISMS)[number];

export const PRICING_MECHANISM_LABELS: Record<PricingMechanism, string> = {
  A_upfront_deployment_fee: "A — Upfront deployment fee + lower recurring",
  B_all_inclusive_recurring: "B — All-inclusive recurring fee",
  C_higher_short_term_rate: "C — Higher short-term rate",
  D_multi_season_discount: "D — Multi-season pricing discount",
  E_early_termination_charge: "E — Early-termination / unamortized deployment charge",
  F_probabilistic_risk_pricing: "F — Operator assumes termination risk, prices probabilistically",
};

export type MowerClass =
  | "residential_small"
  | "residential_large"
  | "prosumer"
  | "commercial_light"
  | "commercial_mid"
  | "commercial_large"
  | "industrial";

export const MOWER_CLASS_LABELS: Record<MowerClass, string> = {
  residential_small: "Residential (small)",
  residential_large: "Residential (large lot)",
  prosumer: "Prosumer",
  commercial_light: "Commercial (light)",
  commercial_mid: "Commercial (mid)",
  commercial_large: "Commercial (large)",
  industrial: "Industrial",
};

export type MarketSegment = "residential" | "prosumer" | "commercial";

export type NavigationTech =
  | "boundary_wire"
  | "rtk_gnss"
  | "rtk_gnss_vision"
  | "vision_only"
  | "lidar_gnss"
  | "satellite_gnss"
  | "other";

export const NAVIGATION_TECH_LABELS: Record<NavigationTech, string> = {
  boundary_wire: "Boundary wire",
  rtk_gnss: "RTK GNSS",
  rtk_gnss_vision: "RTK GNSS + vision",
  vision_only: "Vision only",
  lidar_gnss: "LiDAR + GNSS",
  satellite_gnss: "Satellite GNSS (no local base)",
  other: "Other",
};

export type DecisionStatus =
  | "pursue"
  | "pursue_subject_to_site_visit"
  | "pilot_candidate"
  | "conditional"
  | "reject";

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  pursue: "Pursue",
  pursue_subject_to_site_visit: "Pursue Subject to Site Visit",
  pilot_candidate: "Pilot Candidate",
  conditional: "Conditional",
  reject: "Reject",
};

export type ClusterClassification =
  | "dense_highly_additive"
  | "building_density"
  | "isolated"
  | "strategic_exception";

export const CLUSTER_CLASSIFICATION_LABELS: Record<ClusterClassification, string> = {
  dense_highly_additive: "Dense / highly additive",
  building_density: "Building density",
  isolated: "Isolated",
  strategic_exception: "Strategic exception",
};

export type ReadinessBand = "strong" | "candidate" | "conditional" | "poor";

export const READINESS_BAND_LABELS: Record<ReadinessBand, string> = {
  strong: "Strong Candidate",
  candidate: "Candidate / Requires Review",
  conditional: "Conditional",
  poor: "Poor Candidate",
};

/* ------------------------------------------------------------------ */
/* Section 1 — Property intake                                         */
/* ------------------------------------------------------------------ */

/** Placeholder for future GIS / aerial / parcel integrations. Nothing here is wired yet. */
export interface GisPlaceholder {
  /** 'manual' for MVP. Future: 'regrid' | 'nearmap' | 'google_solar' | 'esri' ... */
  measurementSource: "manual" | "aerial_estimate" | "gis_import";
  parcelId: string;
  aerialImageUrl: string;
  measuredTurfAcres: number | null;
  lastSyncedAt: Iso8601Date | null;
  /** Free-text note about what still needs to be measured from imagery. */
  note: string;
}

export interface PropertyIntake {
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  propertyType: PropertyType;
  owner: string;
  propertyManager: string;
  existingLandscaper: string;
  parcelAcres: number;
  estimatedTurfAcres: number;
  existingAnnualLandscapeCost: number;
  estimatedMowingOnlyCost: number;
  annualMowingVisits: number;
  terminationProvision: TerminationProvision;
  contractExpiration: Iso8601Date | "";
  notes: string;
  gis: GisPlaceholder;
}

/* ------------------------------------------------------------------ */
/* Section 2 — Site geometry & turf assessment                         */
/* ------------------------------------------------------------------ */

export interface SiteGeometry {
  totalTurfAcres: number;
  contiguousTurfAcres: number;
  mowingZoneCount: number;
  largestZoneAcres: number;
  averageZoneAcres: number;
  /** 0–100. Portion of turf the evaluator believes a robot can actually cut. */
  autonomousCompatiblePct: number;
  turfPerimeterLinearFeet: number;
  roadCrossings: number;
  sidewalkCrossings: number;
  gates: number;
  narrowPassages: number;
  curbLinearFeet: number;
  retainingWalls: number;
  landscapeBeds: number;
  trees: number;
  lightPoles: number;
  signage: number;
  drainageStructures: number;
  waterHazards: number;
  steepSlopeAreas: number;
  /** Max sustained slope encountered on mowable turf, in percent grade. */
  maxSlopePct: number;
  irregularTurfAreas: number;
}

/**
 * Qualitative 1–5 ratings. 5 = most favorable for autonomous mowing in every case.
 * The UI renders direction-correct labels (see RATING_SCALES).
 */
export interface SiteRatings {
  turfFragmentation: number;
  slopeDifficulty: number;
  obstacleDensity: number;
  edgeComplexity: number;
  groundQuality: number;
  drainageWetAreas: number;
  debrisExposure: number;
  pedestrianInteraction: number;
  vehicleInteraction: number;
  vandalismTheftExposure: number;
  gpsRtkVisibility: number;
  cellularConnectivity: number;
  chargingStationSuitability: number;
}

export type SiteRatingKey = keyof SiteRatings;

export interface SiteAssessment {
  geometry: SiteGeometry;
  ratings: SiteRatings;
  /** 0–100. Share of turf perimeter that will still need a human trimmer. */
  perimeterManualFinishPct: number;
  /** Finish quality the customer/property type demands. Drives equipment matching. */
  requiredFinishQuality: 1 | 2 | 3 | 4 | 5;
  assessorNotes: string;
}

/* ------------------------------------------------------------------ */
/* Section 4 — Intervention / human-in-the-loop                        */
/* ------------------------------------------------------------------ */

export interface InterventionInputs {
  /** If true the engine predicts the unplanned physical rate from readiness. */
  useModelPredictedRate: boolean;
  scheduledVisitsPerMachineYear: number;
  /** Manual override used when useModelPredictedRate is false. */
  unplannedPhysicalPerMachineMonth: number;
  remotePerMachineMonth: number;
  avgPhysicalInterventionHours: number;
  avgRemoteInterventionHours: number;
  avgScheduledVisitHours: number;
  /** One-way drive time from the servicing hub, hours. */
  avgTravelHours: number;
  /** Machine operating hours between blade changes / service. */
  bladeServiceIntervalHours: number;
  commissioningMonths: number;
  /** Intervention rate multiplier during the commissioning window. */
  commissioningMultiplier: number;
  /** 0–100. Expected machine availability once stabilized. */
  expectedUptimePct: number;
  /** Percent shares by category; normalized to 100 by the engine. */
  categoryMix: Record<InterventionCategory, number>;
}

/* ------------------------------------------------------------------ */
/* Section 5 — Product / equipment database                            */
/* ------------------------------------------------------------------ */

export interface MowerProduct {
  id: string;
  manufacturer: string;
  model: string;
  mowerClass: MowerClass;
  segment: MarketSegment;
  msrp: number;
  /** What we actually expect to pay, net of dealer/fleet terms. */
  acquisitionCost: number;
  /** Annual financed/leased cost if we do not pay cash. */
  financedAnnualCost: number;
  /** Acres one machine sustains comfortably over a season. */
  recommendedAcres: number;
  /** Hard ceiling per machine. */
  maxAcres: number;
  cuttingWidthInches: number;
  runtimeMinutes: number;
  chargeMinutes: number;
  navigationTech: NavigationTech;
  requiresRtk: boolean;
  requiresCellular: boolean;
  hasVision: boolean;
  obstacleDetection: "none" | "bump" | "ultrasonic" | "vision" | "vision_lidar";
  maxSlopePct: number;
  edgeCuttingCapability: 1 | 2 | 3 | 4 | 5;
  activeTrimming: boolean;
  fleetManagement: boolean;
  remoteDiagnostics: boolean;
  apiAvailable: boolean;
  warrantyMonths: number;
  usefulLifeYears: number;
  /** 0–100, percent of acquisition cost expected at end of useful life. */
  residualValuePct: number;
  /** Max discrete zones one machine can hold in its work plan. */
  multiZoneSupport: number;
  commercialUseLimitations: string;
  serviceNetwork: 1 | 2 | 3 | 4 | 5;
  /** Every seeded spec is a PLACEHOLDER until verified against an OEM datasheet. */
  specsVerified: boolean;
  sourceNote: string;
}

/* ------------------------------------------------------------------ */
/* Section 6 — Geographic density / cluster                            */
/* ------------------------------------------------------------------ */

export interface ClusterInputs {
  distanceToNearestDeploymentMiles: number;
  machinesWithin5Miles: number;
  machinesWithin10Miles: number;
  machinesWithin15Miles: number;
  machinesWithin25Miles: number;
  machinesWithin50Miles: number;
  autonomousAcresInCluster: number;
  /** One-way technician travel minutes from the servicing hub. */
  technicianTravelMinutes: number;
  /** Operator override: treat an isolated site as a deliberate beachhead. */
  strategicException: boolean;
  strategicExceptionRationale: string;
}

/* ------------------------------------------------------------------ */
/* Section 7 — Residual landscaping                                    */
/* ------------------------------------------------------------------ */

export interface ResidualServiceLine {
  service: ResidualService;
  inIncumbentScope: boolean;
  owner: ResidualOwner;
  estimatedAnnualCost: number;
  note: string;
}

export interface ResidualScope {
  lines: ResidualServiceLine[];
  /** 0–100. Share of the incumbent MOWING scope robotics actually replaces. */
  incumbentMowingScopeReplacedPct: number;
  landscaperRemainsOnsite: boolean;
  landscaperCanSupportRobots: boolean;
  landscaperRole: LandscaperRole;
  notes: string;
}

/* ------------------------------------------------------------------ */
/* Section 8 — Customer value                                          */
/* ------------------------------------------------------------------ */

export interface CustomerValueInputs {
  /** Overrides intake mowing-only cost when > 0. */
  annualMowingOnlyCostOverride: number;
  currentCutsPerMonth: number;
  currentCrewVisibilityRating: number; // 1-5, 5 = crew presence is a problem today
  currentComplaintsRating: number; // 1-5, 5 = frequent complaints
  currentNoiseRating: number; // 1-5, 5 = noise is a significant issue
  currentFuelGallonsPerYear: number;
  vendorManagementBurdenRating: number; // 1-5, 5 = heavy burden
  proposedCutsPerWeek: number;
  expectedAppearanceConsistencyRating: number; // 1-5, 5 = highly consistent
  pricingApproach: PricingApproach;
  /** Used when pricingApproach === 'custom'. Negative = premium over incumbent. */
  customTargetSavingsPct: number;
  qualitativeNotes: string;
}

/* ------------------------------------------------------------------ */
/* Section 9 — Contract structure                                      */
/* ------------------------------------------------------------------ */

export interface ContractInputs {
  structure: ContractStructure;
  /** Used when structure === 'custom'. */
  customSeasons: number;
  mechanism: PricingMechanism;
  /** 0–100. Share of deployment cost charged upfront under mechanism A. */
  upfrontDeploymentFeeCoveragePct: number;
  /** Operator override of the modeled termination probability, 0–100. Negative = use model. */
  terminationProbabilityOverridePct: number;
  notes: string;
}

/* ------------------------------------------------------------------ */
/* Section 10 — Operator economics manual inputs                       */
/* ------------------------------------------------------------------ */

export interface EconomicsInputs {
  /** Optional additional service revenue booked at this property. */
  otherServiceRevenue: number;
  /** Charge the customer an implementation fee separate from the contract mechanism. */
  implementationFeeOverride: number;
  /** Pay cash (false) or finance/lease the fleet (true). */
  financeEquipment: boolean;
  /** Overrides the engine's recommended annual price when > 0. */
  annualPriceOverride: number;
  notes: string;
}

/* ------------------------------------------------------------------ */
/* Equipment selection override                                        */
/* ------------------------------------------------------------------ */

export interface EquipmentInputs {
  /** Force a specific product instead of the engine's pick. */
  selectedProductIdOverride: string;
  /** Force a machine count instead of the engine's computed count. */
  machineCountOverride: number;
  notes: string;
}

/* ------------------------------------------------------------------ */
/* Aggregate property record                                           */
/* ------------------------------------------------------------------ */

export interface Property {
  id: string;
  createdAt: Iso8601Date;
  updatedAt: Iso8601Date;
  /** Operator's manual decision override; null means use the engine recommendation. */
  decisionOverride: DecisionStatus | null;
  intake: PropertyIntake;
  assessment: SiteAssessment;
  intervention: InterventionInputs;
  cluster: ClusterInputs;
  residual: ResidualScope;
  customerValue: CustomerValueInputs;
  contract: ContractInputs;
  economics: EconomicsInputs;
  equipment: EquipmentInputs;
  /** Diligence items the operator has added or resolved manually. */
  diligenceNotes: string[];
}

/* ------------------------------------------------------------------ */
/* Assumptions (Admin)                                                 */
/* ------------------------------------------------------------------ */

export interface ReadinessBands {
  strongMin: number;
  candidateMin: number;
  conditionalMin: number;
}

export interface LaborAssumptions {
  fieldTechHourlyCost: number;
  remoteTechHourlyCost: number;
  /** Multiplier applied to raw wage for burden (taxes, benefits, vehicle). */
  laborBurdenMultiplier: number;
  /** Fully-burdened hourly cost of the vehicle+tech while driving. */
  travelHourlyCost: number;
  /** Trips per unplanned physical intervention. <1 means some get batched. */
  tripBatchingFactor: number;
}

export interface CapitalAssumptions {
  /** Annual cost of capital used for capital recovery and NPV of residual. */
  costOfCapitalPct: number;
  /** Term used when financeEquipment is true. */
  financeTermYears: number;
  financeApr: number;
  defaultUsefulLifeYears: number;
  /** Cost to pull, refurbish, transport and re-commission a machine elsewhere. */
  redeploymentCostPerMachine: number;
  /** Months a redeployed machine is expected to sit idle before reassignment. */
  redeploymentIdleMonths: number;
}

export interface FleetOpexAssumptions {
  monitoringConnectivityPerMachineYear: number;
  insurancePctOfCapitalPerYear: number;
  repairsPctOfCapitalPerYear: number;
  consumablesPerMachineYear: number;
  bladeSetCost: number;
  batteryReservePctOfCapitalPerYear: number;
  storageWinterizationPerMachineYear: number;
  /** Spare machines held per live machine. */
  spareRatio: number;
  /** Minimum spares once the site has at least this many live machines. */
  minSparesThresholdMachines: number;
  variableAdminPctOfRevenue: number;
}

export interface DeploymentAssumptions {
  siteSurveyHours: number;
  commissioningHoursPerMachine: number;
  installMaterialsPerMachine: number;
  chargingStationCost: number;
  rtkBaseStationCost: number;
  mobilizationCost: number;
  /** Extra commissioning hours charged for each discrete mowing zone. */
  hoursPerAdditionalZone: number;
  /** Extra commissioning hours per road/sidewalk crossing that must be mapped. */
  hoursPerCrossing: number;
}

export interface SeasonAssumptions {
  mowingSeasonWeeks: number;
  operatingDaysPerWeek: number;
  operatingHoursPerDay: number;
  /** Month the mowing season starts, 1–12. Used for break-even dating. */
  seasonStartMonth: number;
}

export interface InterventionModelAssumptions {
  /** Unplanned physical interventions per machine-month at the reference score. */
  baselinePhysicalPerMachineMonth: number;
  baselineRemotePerMachineMonth: number;
  /** Readiness score at which the baseline rate applies. */
  referenceReadinessScore: number;
  /** Rate multiplier change per 25 readiness points below reference. */
  readinessSensitivity: number;
  minMultiplier: number;
  maxMultiplier: number;
}

export interface PricingAssumptions {
  /** Target customer savings, percent of replaced incumbent spend. */
  valueSavingsPct: number;
  volumeSwitcherSavingsPct: number;
  /** Negative savings = premium charged over incumbent spend. */
  premiumPilotSavingsPct: number;
  /** Termination probability (0–100) by contract structure. */
  terminationProbabilityPct: Record<ContractStructure, number>;
  /** Uplift applied to recurring price under mechanism C. */
  shortTermRateUpliftPct: number;
  /** 0–100. Share of a contractual early-termination charge we expect to actually collect. */
  earlyTerminationChargeCollectibilityPct: number;
  /** Discount applied under mechanism D, per season of commitment beyond one. */
  multiSeasonDiscountPctPerSeason: number;
  maxMultiSeasonDiscountPct: number;
}

export interface UnderwritingThresholds {
  targetContributionMarginPct: number;
  conditionalContributionMarginPct: number;
  /** Below this, the deal is a watch/reject on economics alone. */
  rejectContributionMarginPct: number;
  targetPaybackYears: number;
  /** Premium over replaced incumbent spend (percent) we believe a customer will actually accept. */
  maxAcceptablePremiumPct: number;
  minMachineUtilizationPct: number;
  maxMachineUtilizationPct: number;
}

export interface ClusterAssumptions {
  /** Distance (miles) at or below which a site is considered co-located. */
  denseDistanceMiles: number;
  isolatedDistanceMiles: number;
  /** Machines within 25 miles needed to count as a real cluster. */
  denseMachineCount: number;
  buildingMachineCount: number;
  /** Weighting of each radius band in the cluster density sub-score. */
  radiusWeights: { r5: number; r10: number; r15: number; r25: number; r50: number };
  denseScoreMin: number;
  buildingScoreMin: number;
}

export interface Assumptions {
  readinessWeights: Record<ReadinessCategory, number>;
  readinessBands: ReadinessBands;
  labor: LaborAssumptions;
  capital: CapitalAssumptions;
  fleetOpex: FleetOpexAssumptions;
  deployment: DeploymentAssumptions;
  season: SeasonAssumptions;
  interventionModel: InterventionModelAssumptions;
  pricing: PricingAssumptions;
  thresholds: UnderwritingThresholds;
  cluster: ClusterAssumptions;
}
