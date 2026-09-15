import type {
  Assumptions,
  ReadinessBand,
  ReadinessCategory,
  SiteAssessment,
} from "@/lib/types";
import { READINESS_CATEGORIES, READINESS_CATEGORY_LABELS } from "@/lib/types";
import { clamp100, div, ratingToScore, scaleScore, weightedAverage } from "./util";

export interface ReadinessCategoryResult {
  category: ReadinessCategory;
  label: string;
  /** 0–100 sub-score for the category. */
  score: number;
  /** Weight actually applied (normalized so weights always sum to 100). */
  weight: number;
  /** Points this category contributes to the overall score. */
  contribution: number;
  /** Points lost versus a perfect category score. */
  pointsLost: number;
  /** Plain-language explanation of what moved the sub-score. */
  detail: string;
}

export interface ReadinessFlag {
  category: ReadinessCategory | "site";
  severity: "critical" | "major" | "watch";
  message: string;
}

export interface ReadinessResult {
  score: number;
  band: ReadinessBand;
  bandLabel: string;
  categories: ReadinessCategoryResult[];
  flags: ReadinessFlag[];
  /** Categories sorted by points lost, i.e. what is actually holding the site back. */
  topDetractors: ReadinessCategoryResult[];
  autonomousAcres: number;
}

const BAND_LABELS: Record<ReadinessBand, string> = {
  strong: "Strong Candidate",
  candidate: "Candidate / Requires Review",
  conditional: "Conditional",
  poor: "Poor Candidate",
};

/**
 * Weighted Robot Readiness Score, 0–100.
 *
 * Deliberately transparent: every category is a small, readable formula over
 * inputs the evaluator entered, and each one reports the sentence that explains
 * its result. No site is auto-rejected — poor scores produce flags instead.
 */
export function computeReadiness(
  assessment: SiteAssessment,
  clusterScore: number,
  a: Assumptions,
): ReadinessResult {
  const g = assessment.geometry;
  const r = assessment.ratings;
  const totalTurf = Math.max(0, g.totalTurfAcres);

  const sub: Record<ReadinessCategory, { score: number; detail: string }> = {
    autonomousTurfCompatibility: autonomousTurfCompatibility(assessment),
    turfGeometry: turfGeometry(assessment),
    obstaclesCrossings: obstaclesCrossings(assessment),
    connectivityLocalization: {
      score: weightedAverage([
        { value: ratingToScore(r.gpsRtkVisibility), weight: 0.6 },
        { value: ratingToScore(r.cellularConnectivity), weight: 0.4 },
      ]),
      detail: `GPS/RTK visibility ${r.gpsRtkVisibility}/5 and cellular ${r.cellularConnectivity}/5. RTK-guided platforms need sky view; fleet telemetry needs a usable carrier signal.`,
    },
    terrainSlopeDrainage: terrainSlopeDrainage(assessment),
    publicInteractionSecurity: {
      score: weightedAverage([
        { value: ratingToScore(r.pedestrianInteraction), weight: 0.3 },
        { value: ratingToScore(r.vehicleInteraction), weight: 0.3 },
        { value: ratingToScore(r.vandalismTheftExposure), weight: 0.4 },
      ]),
      detail: `Pedestrian ${r.pedestrianInteraction}/5, vehicle ${r.vehicleInteraction}/5, vandalism/theft exposure ${r.vandalismTheftExposure}/5. Public exposure drives both intervention rate and asset loss risk.`,
    },
    chargingInfrastructure: {
      score: ratingToScore(r.chargingStationSuitability),
      detail: `Charging-station suitability ${r.chargingStationSuitability}/5. Covers available power drops, a protected hardstand location and distance from the mowing zones.`,
    },
    residualManualFinishing: residualManualFinishing(assessment),
    geographicCluster: {
      score: clamp100(clusterScore),
      detail: `Cluster score of ${Math.round(clusterScore)} carried in from the geographic density assessment.`,
    },
  };

  // Normalize weights so an edited weight set that does not sum to 100 still works.
  const rawWeights = a.readinessWeights;
  const weightTotal = READINESS_CATEGORIES.reduce((s, k) => s + Math.max(0, rawWeights[k] ?? 0), 0);

  const categories: ReadinessCategoryResult[] = READINESS_CATEGORIES.map((key) => {
    const weight = weightTotal > 0 ? (Math.max(0, rawWeights[key] ?? 0) / weightTotal) * 100 : 0;
    const score = clamp100(sub[key].score);
    return {
      category: key,
      label: READINESS_CATEGORY_LABELS[key],
      score,
      weight,
      contribution: (score * weight) / 100,
      pointsLost: ((100 - score) * weight) / 100,
      detail: sub[key].detail,
    };
  });

  const score = clamp100(categories.reduce((s, c) => s + c.contribution, 0));
  const band = bandFor(score, a);

  return {
    score,
    band,
    bandLabel: BAND_LABELS[band],
    categories,
    flags: buildFlags(assessment, categories, clusterScore),
    topDetractors: [...categories].sort((x, y) => y.pointsLost - x.pointsLost).slice(0, 4),
    autonomousAcres: (totalTurf * clamp100(g.autonomousCompatiblePct)) / 100,
  };
}

export function bandFor(score: number, a: Assumptions): ReadinessBand {
  const b = a.readinessBands;
  if (score >= b.strongMin) return "strong";
  if (score >= b.candidateMin) return "candidate";
  if (score >= b.conditionalMin) return "conditional";
  return "poor";
}

/* ---------------------- category formulas ---------------------- */

function autonomousTurfCompatibility(assessment: SiteAssessment) {
  const pct = clamp100(assessment.geometry.autonomousCompatiblePct);
  return {
    score: pct,
    detail: `${pct.toFixed(0)}% of turf assessed as autonomous-compatible, applied directly as the sub-score. This is the single heaviest input in the model and the first thing to verify on site.`,
  };
}

function turfGeometry(assessment: SiteAssessment) {
  const g = assessment.geometry;
  const total = Math.max(0, g.totalTurfAcres);
  const contiguousShare = clamp100(div(g.contiguousTurfAcres, total, 0) * 100);
  // Zone density: acres per zone. 1.5+ acres per zone is a comfortable robot work area.
  const acresPerZone = div(total, Math.max(1, g.mowingZoneCount), 0);
  const zoneSizeScore = scaleScore(acresPerZone, 1.5, 0.1);
  const largestZoneScore = scaleScore(div(g.largestZoneAcres, total, 0) * 100, 70, 10);
  const fragmentationRating = ratingToScore(assessment.ratings.turfFragmentation);

  const score = weightedAverage([
    { value: contiguousShare, weight: 0.35 },
    { value: zoneSizeScore, weight: 0.25 },
    { value: largestZoneScore, weight: 0.15 },
    { value: fragmentationRating, weight: 0.25 },
  ]);

  return {
    score,
    detail: `${contiguousShare.toFixed(0)}% of turf is contiguous across ${g.mowingZoneCount} zones (${acresPerZone.toFixed(2)} ac/zone average, largest zone ${g.largestZoneAcres.toFixed(2)} ac). Fragmentation rated ${assessment.ratings.turfFragmentation}/5. Small, scattered zones force transport moves and depress machine utilization.`,
  };
}

function obstaclesCrossings(assessment: SiteAssessment) {
  const g = assessment.geometry;
  const acres = Math.max(0.25, g.totalTurfAcres);
  const crossings = g.roadCrossings + g.sidewalkCrossings;
  // Road crossings are weighted much harder than sidewalk crossings.
  const weightedCrossings = g.roadCrossings * 2.5 + g.sidewalkCrossings * 1 + g.narrowPassages * 1.5 + g.gates * 0.75;
  const crossingScore = scaleScore(div(weightedCrossings, acres, 0), 0, 4);

  const fixedObstacles =
    g.trees + g.lightPoles + g.signage + g.drainageStructures + g.landscapeBeds * 1.5 + g.retainingWalls * 2;
  const obstacleDensityScore = scaleScore(div(fixedObstacles, acres, 0), 2, 40);

  const score = weightedAverage([
    { value: crossingScore, weight: 0.4 },
    { value: obstacleDensityScore, weight: 0.3 },
    { value: ratingToScore(assessment.ratings.obstacleDensity), weight: 0.2 },
    { value: ratingToScore(assessment.ratings.edgeComplexity), weight: 0.1 },
  ]);

  return {
    score,
    detail: `${crossings} crossings (${g.roadCrossings} road, ${g.sidewalkCrossings} sidewalk), ${g.gates} gates, ${g.narrowPassages} narrow passages and roughly ${Math.round(fixedObstacles)} weighted fixed obstacles over ${g.totalTurfAcres.toFixed(1)} ac. Road crossings are counted at 2.5x because they are the highest-consequence autonomy event on a commercial site.`,
  };
}

function terrainSlopeDrainage(assessment: SiteAssessment) {
  const g = assessment.geometry;
  const r = assessment.ratings;
  const slopeAreaScore = scaleScore(div(g.steepSlopeAreas, Math.max(0.25, g.totalTurfAcres), 0), 0, 2);
  const maxSlopeScore = scaleScore(g.maxSlopePct, 10, 55);

  const score = weightedAverage([
    { value: ratingToScore(r.slopeDifficulty), weight: 0.3 },
    { value: maxSlopeScore, weight: 0.2 },
    { value: slopeAreaScore, weight: 0.1 },
    { value: ratingToScore(r.groundQuality), weight: 0.2 },
    { value: ratingToScore(r.drainageWetAreas), weight: 0.2 },
  ]);

  return {
    score,
    detail: `Max sustained grade ${g.maxSlopePct}% with ${g.steepSlopeAreas} steep areas. Slope favorability ${r.slopeDifficulty}/5, ground quality ${r.groundQuality}/5, drainage ${r.drainageWetAreas}/5. Wet ground causes rutting and stuck-machine dispatches, not just missed cuts.`,
  };
}

function residualManualFinishing(assessment: SiteAssessment) {
  const perimeterPct = clamp100(assessment.perimeterManualFinishPct);
  const perimeterScore = scaleScore(perimeterPct, 0, 100);
  const finishDemand = scaleScore(assessment.requiredFinishQuality, 1, 5);
  const score = weightedAverage([
    { value: perimeterScore, weight: 0.6 },
    { value: ratingToScore(assessment.ratings.edgeComplexity), weight: 0.25 },
    { value: finishDemand, weight: 0.15 },
  ]);
  return {
    score,
    detail: `${perimeterPct.toFixed(0)}% of turf perimeter still needs manual finishing; required finish quality is ${assessment.requiredFinishQuality}/5 and edge complexity is rated ${assessment.ratings.edgeComplexity}/5. Residual trimming does not disappear — it determines whether the customer still needs a crew on site.`,
  };
}

/* ---------------------- flags ---------------------- */

function buildFlags(
  assessment: SiteAssessment,
  categories: ReadinessCategoryResult[],
  clusterScore: number,
): ReadinessFlag[] {
  const flags: ReadinessFlag[] = [];
  const g = assessment.geometry;
  const r = assessment.ratings;

  for (const c of categories) {
    if (c.weight <= 0) continue;
    if (c.score < 40) {
      flags.push({
        category: c.category,
        severity: "critical",
        message: `${c.label} scores ${c.score.toFixed(0)}/100 and removes ${c.pointsLost.toFixed(1)} points from the site score.`,
      });
    } else if (c.score < 60) {
      flags.push({
        category: c.category,
        severity: "major",
        message: `${c.label} scores ${c.score.toFixed(0)}/100, costing ${c.pointsLost.toFixed(1)} points.`,
      });
    }
  }

  if (g.autonomousCompatiblePct < 60) {
    flags.push({
      category: "site",
      severity: g.autonomousCompatiblePct < 45 ? "critical" : "major",
      message: `Only ${g.autonomousCompatiblePct}% of turf is autonomous-compatible, so a crew still has to service the balance.`,
    });
  }
  if (r.gpsRtkVisibility <= 2) {
    flags.push({
      category: "connectivityLocalization",
      severity: "critical",
      message: "Poor GPS/RTK visibility rules out wire-free RTK platforms unless a survey proves otherwise.",
    });
  }
  if (r.cellularConnectivity <= 2) {
    flags.push({
      category: "connectivityLocalization",
      severity: "major",
      message: "Weak cellular coverage will degrade remote monitoring and push interventions into the field.",
    });
  }
  if (r.vandalismTheftExposure <= 2) {
    flags.push({
      category: "publicInteractionSecurity",
      severity: "critical",
      message: "High vandalism/theft exposure on a leave-behind asset. Requires enclosure, tracking or a security plan.",
    });
  }
  if (g.roadCrossings > 0) {
    flags.push({
      category: "obstaclesCrossings",
      severity: g.roadCrossings >= 3 ? "critical" : "major",
      message: `${g.roadCrossings} road crossing(s) required. Each crossing is a safety review item and a likely zone split.`,
    });
  }
  if (g.maxSlopePct > 45) {
    flags.push({
      category: "terrainSlopeDrainage",
      severity: "major",
      message: `Max grade of ${g.maxSlopePct}% approaches or exceeds the limit of most commercial platforms.`,
    });
  }
  if (r.drainageWetAreas <= 2) {
    flags.push({
      category: "terrainSlopeDrainage",
      severity: "major",
      message: "Persistent wet areas — expect stuck-machine dispatches and turf damage claims.",
    });
  }
  if (assessment.perimeterManualFinishPct > 60) {
    flags.push({
      category: "residualManualFinishing",
      severity: "major",
      message: `${assessment.perimeterManualFinishPct}% of perimeter needs manual finishing, which limits the customer's crew reduction.`,
    });
  }
  if (clusterScore < 35) {
    flags.push({
      category: "geographicCluster",
      severity: "major",
      message: "Isolated deployment — technician travel is not amortized across other sites.",
    });
  }
  if (g.mowingZoneCount > 8) {
    flags.push({
      category: "turfGeometry",
      severity: "watch",
      message: `${g.mowingZoneCount} discrete mowing zones. Verify the platform can hold this many work areas.`,
    });
  }

  return flags;
}
