import { createEmptyProperty } from "@/lib/defaults";
import type { Property, ResidualServiceLine } from "@/lib/types";

const SEED_DATE = "2026-03-02T15:00:00.000Z";

function withResidualCosts(
  lines: ResidualServiceLine[],
  costs: Partial<Record<ResidualServiceLine["service"], number>>,
  owner?: ResidualServiceLine["owner"],
): ResidualServiceLine[] {
  return lines.map((l) => ({
    ...l,
    estimatedAnnualCost: costs[l.service] ?? l.estimatedAnnualCost,
    owner: owner ?? l.owner,
  }));
}

/**
 * Three FICTIONAL example properties used to exercise the engine end to end.
 * None of these are real sites, real owners or real contract values.
 */
export function seedProperties(): Property[] {
  return [dense(), fragmented(), campus()];
}

/** 1. High-quality dense commercial candidate. */
function dense(): Property {
  const p = createEmptyProperty("seed-northgate-logistics", SEED_DATE);
  p.intake = {
    ...p.intake,
    name: "Northgate Logistics Center",
    addressLine1: "4400 Northgate Industrial Pkwy",
    city: "Grand Prairie",
    state: "TX",
    postalCode: "75050",
    propertyType: "industrial",
    owner: "Meridian Industrial Partners (fictional)",
    propertyManager: "Caldwell Asset Services (fictional)",
    existingLandscaper: "Bluegrass Commercial Grounds (fictional)",
    parcelAcres: 46,
    estimatedTurfAcres: 11.2,
    existingAnnualLandscapeCost: 104000,
    estimatedMowingOnlyCost: 64000,
    annualMowingVisits: 32,
    terminationProvision: "thirty_day_convenience",
    contractExpiration: "2026-12-31",
    notes:
      "FICTIONAL EXAMPLE. Single-owner distribution park with wide, open detention-basin turf on three sides. Incumbent has raised the mowing line item twice in two years on labor availability. Landscaper contract is 30-day terminable, which is the norm and the reason the contract-structure module exists.",
  };
  p.assessment.geometry = {
    ...p.assessment.geometry,
    totalTurfAcres: 11.2,
    contiguousTurfAcres: 9.6,
    mowingZoneCount: 3,
    largestZoneAcres: 6.2,
    averageZoneAcres: 3.73,
    autonomousCompatiblePct: 93,
    turfPerimeterLinearFeet: 8900,
    roadCrossings: 0,
    sidewalkCrossings: 1,
    gates: 2,
    narrowPassages: 1,
    curbLinearFeet: 4200,
    retainingWalls: 0,
    landscapeBeds: 6,
    trees: 34,
    lightPoles: 18,
    signage: 4,
    drainageStructures: 7,
    waterHazards: 1,
    steepSlopeAreas: 1,
    maxSlopePct: 14,
    irregularTurfAreas: 2,
  };
  p.assessment.ratings = {
    turfFragmentation: 4,
    slopeDifficulty: 4,
    obstacleDensity: 4,
    edgeComplexity: 4,
    groundQuality: 4,
    drainageWetAreas: 4,
    debrisExposure: 4,
    pedestrianInteraction: 5,
    vehicleInteraction: 3,
    vandalismTheftExposure: 4,
    gpsRtkVisibility: 5,
    cellularConnectivity: 5,
    chargingStationSuitability: 5,
  };
  p.assessment.perimeterManualFinishPct = 22;
  p.assessment.requiredFinishQuality = 3;
  p.assessment.assessorNotes =
    "FICTIONAL. Detention basin turf is open and uninterrupted. Gate access is controlled; no public pedestrian traffic. Power drop available at the truck court for a dock.";

  p.cluster = {
    distanceToNearestDeploymentMiles: 4,
    machinesWithin5Miles: 6,
    machinesWithin10Miles: 14,
    machinesWithin15Miles: 21,
    machinesWithin25Miles: 33,
    machinesWithin50Miles: 48,
    autonomousAcresInCluster: 72,
    technicianTravelMinutes: 14,
    strategicException: false,
    strategicExceptionRationale: "",
  };

  p.residual.incumbentMowingScopeReplacedPct = 88;
  p.residual.landscaperRemainsOnsite = true;
  p.residual.landscaperCanSupportRobots = true;
  p.residual.landscaperRole = "residual_plus_robot_support";
  p.residual.lines = withResidualCosts(p.residual.lines, {
    string_trimming: 6200,
    edging: 3400,
    beds: 9800,
    pruning: 4200,
    fertilizer: 5100,
    weed_control: 3600,
    irrigation: 2800,
    cleanup: 2200,
    leaf_removal: 3900,
    seasonal_color: 0,
    snow: 0,
    other: 0,
  });
  p.residual.notes =
    "FICTIONAL. Incumbent stays for beds, fertilization and trimming. They have offered to perform defined robot-support tasks (debris sweeps, dock clearing) for a fixed monthly fee.";

  p.customerValue = {
    ...p.customerValue,
    currentCutsPerMonth: 4,
    currentCrewVisibilityRating: 3,
    currentComplaintsRating: 2,
    currentNoiseRating: 2,
    currentFuelGallonsPerYear: 720,
    vendorManagementBurdenRating: 3,
    proposedCutsPerWeek: 3,
    expectedAppearanceConsistencyRating: 5,
    pricingApproach: "value",
    qualitativeNotes:
      "Tenant is a 24/7 distribution operation; crews mowing near truck court traffic is a real safety friction point.",
  };

  p.contract = {
    ...p.contract,
    structure: "two_season",
    mechanism: "D_multi_season_discount",
  };
  p.intervention.expectedUptimePct = 94;
  p.diligenceNotes = ["Confirm detention basin mow-height requirements with the municipality."];
  return p;
}

/** 2. Marginal, fragmented commercial site. */
function fragmented(): Property {
  const p = createEmptyProperty("seed-riverbend-retail", SEED_DATE);
  p.intake = {
    ...p.intake,
    name: "Riverbend Crossing Retail Center",
    addressLine1: "1820 Riverbend Blvd",
    city: "Columbus",
    state: "OH",
    postalCode: "43215",
    propertyType: "retail",
    owner: "Harborline Retail Trust (fictional)",
    propertyManager: "Harborline Property Management (fictional)",
    existingLandscaper: "GreenEdge Services (fictional)",
    parcelAcres: 14.2,
    estimatedTurfAcres: 2.6,
    existingAnnualLandscapeCost: 38000,
    estimatedMowingOnlyCost: 14200,
    annualMowingVisits: 26,
    terminationProvision: "thirty_day_convenience",
    contractExpiration: "2026-10-31",
    notes:
      "FICTIONAL EXAMPLE. Strip retail with turf broken into parking islands and a narrow frontage strip. Included as a worked example of a site the screen should push back on.",
  };
  p.assessment.geometry = {
    ...p.assessment.geometry,
    totalTurfAcres: 2.6,
    contiguousTurfAcres: 0.9,
    mowingZoneCount: 11,
    largestZoneAcres: 0.7,
    averageZoneAcres: 0.24,
    autonomousCompatiblePct: 52,
    turfPerimeterLinearFeet: 9400,
    roadCrossings: 2,
    sidewalkCrossings: 6,
    gates: 0,
    narrowPassages: 5,
    curbLinearFeet: 8900,
    retainingWalls: 2,
    landscapeBeds: 22,
    trees: 61,
    lightPoles: 26,
    signage: 11,
    drainageStructures: 9,
    waterHazards: 0,
    steepSlopeAreas: 3,
    maxSlopePct: 26,
    irregularTurfAreas: 9,
  };
  p.assessment.ratings = {
    turfFragmentation: 1,
    slopeDifficulty: 3,
    obstacleDensity: 2,
    edgeComplexity: 1,
    groundQuality: 3,
    drainageWetAreas: 3,
    debrisExposure: 2,
    pedestrianInteraction: 1,
    vehicleInteraction: 1,
    vandalismTheftExposure: 2,
    gpsRtkVisibility: 3,
    cellularConnectivity: 4,
    chargingStationSuitability: 2,
  };
  p.assessment.perimeterManualFinishPct = 68;
  p.assessment.requiredFinishQuality = 4;
  p.assessment.assessorNotes =
    "FICTIONAL. Eleven separate turf islands, two of which require crossing an active drive aisle. Frontage strip is 12 ft wide. No secure dock location identified.";

  p.cluster = {
    distanceToNearestDeploymentMiles: 42,
    machinesWithin5Miles: 0,
    machinesWithin10Miles: 0,
    machinesWithin15Miles: 0,
    machinesWithin25Miles: 2,
    machinesWithin50Miles: 5,
    autonomousAcresInCluster: 6,
    technicianTravelMinutes: 58,
    strategicException: false,
    strategicExceptionRationale: "",
  };

  p.residual.incumbentMowingScopeReplacedPct = 45;
  p.residual.landscaperRemainsOnsite = true;
  p.residual.landscaperCanSupportRobots = false;
  p.residual.landscaperRole = "residual_landscaping_only";
  p.residual.lines = withResidualCosts(p.residual.lines, {
    string_trimming: 7800,
    edging: 4600,
    beds: 8200,
    pruning: 3100,
    fertilizer: 2400,
    weed_control: 2100,
    irrigation: 1400,
    cleanup: 1900,
    leaf_removal: 3200,
    seasonal_color: 2600,
    snow: 0,
    other: 0,
  });
  p.residual.notes =
    "FICTIONAL. More than half the mowing scope stays with a crew. Trimming and edging dominate the labor at this site regardless of who cuts the turf.";

  p.customerValue = {
    ...p.customerValue,
    currentCutsPerMonth: 4,
    currentCrewVisibilityRating: 4,
    currentComplaintsRating: 3,
    currentNoiseRating: 4,
    currentFuelGallonsPerYear: 340,
    vendorManagementBurdenRating: 2,
    proposedCutsPerWeek: 3,
    expectedAppearanceConsistencyRating: 3,
    pricingApproach: "volume_switcher",
    qualitativeNotes: "Tenants complain about mowing during Saturday peak retail hours.",
  };
  p.contract = {
    ...p.contract,
    structure: "thirty_day_cancellable",
    mechanism: "B_all_inclusive_recurring",
  };
  p.intervention.expectedUptimePct = 86;
  p.diligenceNotes = [
    "Two drive-aisle crossings need a documented safety review before any machine is deployed.",
    "No secure charging location identified — a dock in an open parking island is an asset-loss risk.",
  ];
  return p;
}

/** 3. Larger campus requiring multiple robots. */
function campus(): Property {
  const p = createEmptyProperty("seed-cedar-ridge-campus", SEED_DATE);
  p.intake = {
    ...p.intake,
    name: "Cedar Ridge Corporate Campus",
    addressLine1: "900 Cedar Ridge Dr",
    city: "Cary",
    state: "NC",
    postalCode: "27513",
    propertyType: "office_campus",
    owner: "Piedmont Office REIT (fictional)",
    propertyManager: "Ashford Campus Services (fictional)",
    existingLandscaper: "Carolina Grounds Group (fictional)",
    parcelAcres: 96,
    estimatedTurfAcres: 24.5,
    existingAnnualLandscapeCost: 276000,
    estimatedMowingOnlyCost: 128000,
    annualMowingVisits: 34,
    terminationProvision: "ninety_day_convenience",
    contractExpiration: "2027-06-30",
    notes:
      "FICTIONAL EXAMPLE. Four-building campus with large open lawn panels between buildings and a wooded perimeter. Multi-machine deployment with a real cluster-anchor argument.",
  };
  p.assessment.geometry = {
    ...p.assessment.geometry,
    totalTurfAcres: 24.5,
    contiguousTurfAcres: 18.2,
    mowingZoneCount: 6,
    largestZoneAcres: 7.8,
    averageZoneAcres: 4.08,
    autonomousCompatiblePct: 82,
    turfPerimeterLinearFeet: 21000,
    roadCrossings: 1,
    sidewalkCrossings: 9,
    gates: 3,
    narrowPassages: 2,
    curbLinearFeet: 14500,
    retainingWalls: 3,
    landscapeBeds: 31,
    trees: 240,
    lightPoles: 58,
    signage: 14,
    drainageStructures: 18,
    waterHazards: 2,
    steepSlopeAreas: 4,
    maxSlopePct: 22,
    irregularTurfAreas: 5,
  };
  p.assessment.ratings = {
    turfFragmentation: 4,
    slopeDifficulty: 3,
    obstacleDensity: 3,
    edgeComplexity: 3,
    groundQuality: 4,
    drainageWetAreas: 3,
    debrisExposure: 2,
    pedestrianInteraction: 2,
    vehicleInteraction: 3,
    vandalismTheftExposure: 4,
    gpsRtkVisibility: 4,
    cellularConnectivity: 5,
    chargingStationSuitability: 4,
  };
  p.assessment.perimeterManualFinishPct = 38;
  p.assessment.requiredFinishQuality = 5;
  p.assessment.assessorNotes =
    "FICTIONAL. Class-A campus appearance standard. Wooded perimeter drops limbs and nuts — debris exposure is the main intervention driver. Employee foot traffic across lawn panels at lunch.";

  p.cluster = {
    distanceToNearestDeploymentMiles: 12,
    machinesWithin5Miles: 2,
    machinesWithin10Miles: 5,
    machinesWithin15Miles: 9,
    machinesWithin25Miles: 14,
    machinesWithin50Miles: 19,
    autonomousAcresInCluster: 31,
    technicianTravelMinutes: 26,
    strategicException: false,
    strategicExceptionRationale: "",
  };

  p.residual.incumbentMowingScopeReplacedPct = 78;
  p.residual.landscaperRemainsOnsite = true;
  p.residual.landscaperCanSupportRobots = true;
  p.residual.landscaperRole = "residual_plus_robot_support";
  p.residual.lines = withResidualCosts(p.residual.lines, {
    string_trimming: 21000,
    edging: 14500,
    beds: 38000,
    pruning: 16000,
    fertilizer: 18500,
    weed_control: 11000,
    irrigation: 9800,
    cleanup: 7400,
    leaf_removal: 22000,
    seasonal_color: 14000,
    snow: 0,
    other: 0,
  });
  p.residual.notes =
    "FICTIONAL. Campus keeps a full horticultural program. Robotics replaces the mowing line item only; the residual program is roughly the same size as the mowing spend.";

  p.customerValue = {
    ...p.customerValue,
    currentCutsPerMonth: 4,
    currentCrewVisibilityRating: 4,
    currentComplaintsRating: 3,
    currentNoiseRating: 5,
    currentFuelGallonsPerYear: 2100,
    vendorManagementBurdenRating: 4,
    proposedCutsPerWeek: 3,
    expectedAppearanceConsistencyRating: 5,
    pricingApproach: "value",
    qualitativeNotes:
      "Noise during executive meetings and mowing crews on campus during business hours are recurring complaints from the tenant committee.",
  };
  p.contract = {
    ...p.contract,
    structure: "three_season",
    mechanism: "A_upfront_deployment_fee",
    upfrontDeploymentFeeCoveragePct: 60,
  };
  p.intervention.expectedUptimePct = 91;
  p.intervention.categoryMix = {
    ...p.intervention.categoryMix,
    debris: 24,
    navigation: 18,
    obstruction: 20,
  };
  p.diligenceNotes = [
    "Confirm campus appearance standard is achievable without daily perimeter trimming.",
    "Model a second charging location on the north lawn to cut inter-zone transport time.",
  ];
  return p;
}
