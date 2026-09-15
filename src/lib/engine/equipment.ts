import type { Assumptions, EquipmentInputs, MowerProduct, SiteAssessment } from "@/lib/types";
import { clamp, clamp100, div, ratingToScore, scaleScore, weightedAverage } from "./util";

export interface ProductEvaluation {
  product: MowerProduct;
  /** 0–100 overall fit for this specific site. */
  fitScore: number;
  /** Acres one machine can actually hold at this site after site derates. */
  effectiveAcresPerMachine: number;
  /** Product capacity multiplier from site conditions (0.3–1.0). */
  derateFactor: number;
  derateDetail: string[];
  liveMachines: number;
  spareMachines: number;
  utilizationPct: number;
  annualMachineCostEach: number;
  annualCostPerAutonomousAcre: number;
  /** Hard reasons the product should not be used here. */
  disqualifiers: string[];
  /** Soft reasons to be careful. */
  cautions: string[];
  subScores: {
    capacityFit: number;
    utilization: number;
    navigationFit: number;
    terrainFit: number;
    finishFit: number;
    fleetOps: number;
    costEfficiency: number;
    commercialSuitability: number;
  };
}

export interface EquipmentResult {
  autonomousAcres: number;
  recommended: ProductEvaluation | null;
  alternative: ProductEvaluation | null;
  ranked: ProductEvaluation[];
  rationale: string[];
  /** True when the operator forced a product/machine count instead of the engine pick. */
  overridden: boolean;
  liveMachines: number;
  spareMachines: number;
  totalMachines: number;
  utilizationPct: number;
  /** Machine operating hours per machine per season, used by the intervention model. */
  machineOperatingHoursPerYear: number;
}

/**
 * Equipment matching.
 *
 * Explicitly does NOT just take the machine with the largest acreage rating:
 * capacity is derated by site conditions, then scored against utilization,
 * navigation feasibility, terrain, finish quality, fleet supportability and
 * annualized cost per autonomous acre.
 */
export function matchEquipment(
  assessment: SiteAssessment,
  products: MowerProduct[],
  readinessScore: number,
  overrides: EquipmentInputs,
  a: Assumptions,
): EquipmentResult {
  const g = assessment.geometry;
  const autonomousAcres = (Math.max(0, g.totalTurfAcres) * clamp100(g.autonomousCompatiblePct)) / 100;

  const machineOperatingHoursPerYear =
    a.season.mowingSeasonWeeks * a.season.operatingDaysPerWeek * a.season.operatingHoursPerDay;

  const ranked = products
    .map((p) => evaluateProduct(p, assessment, autonomousAcres, readinessScore, a))
    .sort((x, y) => {
      // Any product with a hard disqualifier sorts below every clean product.
      const xBlocked = x.disqualifiers.length > 0 ? 1 : 0;
      const yBlocked = y.disqualifiers.length > 0 ? 1 : 0;
      if (xBlocked !== yBlocked) return xBlocked - yBlocked;
      return y.fitScore - x.fitScore;
    });

  const forced = overrides.selectedProductIdOverride
    ? ranked.find((r) => r.product.id === overrides.selectedProductIdOverride) ?? null
    : null;
  const recommended = forced ?? ranked[0] ?? null;
  const alternative = ranked.find((r) => r.product.id !== recommended?.product.id) ?? null;

  const liveMachines =
    overrides.machineCountOverride > 0
      ? Math.round(overrides.machineCountOverride)
      : recommended?.liveMachines ?? 0;
  const spareMachines = recommended ? spareCount(liveMachines, a) : 0;
  const utilizationPct = recommended
    ? clamp100(div(autonomousAcres, liveMachines * recommended.effectiveAcresPerMachine, 0) * 100)
    : 0;

  return {
    autonomousAcres,
    recommended,
    alternative,
    ranked,
    rationale: buildRationale(recommended, alternative, assessment, autonomousAcres, liveMachines, spareMachines, a),
    overridden: Boolean(forced) || overrides.machineCountOverride > 0,
    liveMachines,
    spareMachines,
    totalMachines: liveMachines + spareMachines,
    utilizationPct,
    machineOperatingHoursPerYear,
  };
}

export function spareCount(liveMachines: number, a: Assumptions): number {
  if (liveMachines <= 0) return 0;
  const ratioSpares = Math.ceil(liveMachines * a.fleetOpex.spareRatio);
  const floorSpares = liveMachines >= a.fleetOpex.minSparesThresholdMachines ? 1 : 0;
  return Math.max(ratioSpares, floorSpares);
}

function evaluateProduct(
  product: MowerProduct,
  assessment: SiteAssessment,
  autonomousAcres: number,
  readinessScore: number,
  a: Assumptions,
): ProductEvaluation {
  const g = assessment.geometry;
  const r = assessment.ratings;
  const derateDetail: string[] = [];

  // --- Capacity derates. A datasheet acre rating assumes a clean open lawn. ---
  let derate = 1;

  const fragmentation = div(g.totalTurfAcres, Math.max(1, g.mowingZoneCount), 0);
  if (fragmentation < 1.5) {
    const f = clamp(0.6 + fragmentation / 3.75, 0.6, 1);
    derate *= f;
    derateDetail.push(`Fragmentation (${fragmentation.toFixed(2)} ac/zone): x${f.toFixed(2)}`);
  }

  const obstacleFactor = clamp(0.65 + (ratingToScore(r.obstacleDensity) / 100) * 0.35, 0.65, 1);
  derate *= obstacleFactor;
  derateDetail.push(`Obstacle density (${r.obstacleDensity}/5): x${obstacleFactor.toFixed(2)}`);

  const slopeHeadroom = div(product.maxSlopePct - g.maxSlopePct, Math.max(1, product.maxSlopePct), 1);
  const slopeFactor = clamp(0.7 + slopeHeadroom * 0.3, 0.7, 1);
  derate *= slopeFactor;
  derateDetail.push(`Slope headroom (site ${g.maxSlopePct}% vs rated ${product.maxSlopePct}%): x${slopeFactor.toFixed(2)}`);

  const groundFactor = clamp(0.8 + (ratingToScore(r.groundQuality) / 100) * 0.2, 0.8, 1);
  derate *= groundFactor;
  derateDetail.push(`Ground quality (${r.groundQuality}/5): x${groundFactor.toFixed(2)}`);

  // Machine downtime is handled in the intervention model, not as a capacity derate.

  derate = clamp(derate, 0.3, 1);

  const effectiveAcresPerMachine = Math.max(0.05, product.recommendedAcres * derate);
  const liveMachines = autonomousAcres > 0 ? Math.max(1, Math.ceil(div(autonomousAcres, effectiveAcresPerMachine, 1))) : 0;
  const spareMachines = spareCount(liveMachines, a);
  const utilizationPct = clamp100(div(autonomousAcres, liveMachines * effectiveAcresPerMachine, 0) * 100);

  const annualMachineCostEach = product.financedAnnualCost;
  const annualCostPerAutonomousAcre = div(annualMachineCostEach * liveMachines, autonomousAcres, 0);

  // --- Hard disqualifiers ---
  const disqualifiers: string[] = [];
  if (g.maxSlopePct > product.maxSlopePct) {
    disqualifiers.push(
      `Site grade of ${g.maxSlopePct}% exceeds the platform's rated ${product.maxSlopePct}% slope capability.`,
    );
  }
  if (product.requiresRtk && r.gpsRtkVisibility <= 2) {
    disqualifiers.push("Platform requires RTK GNSS but the site has poor sky view / RTK visibility.");
  }
  if (product.requiresCellular && r.cellularConnectivity <= 1) {
    disqualifiers.push("Platform requires cellular connectivity that the site cannot provide.");
  }
  if (g.mowingZoneCount > product.multiZoneSupport * 2) {
    disqualifiers.push(
      `${g.mowingZoneCount} mowing zones far exceeds the platform's ${product.multiZoneSupport}-zone work-area support.`,
    );
  }
  if (effectiveAcresPerMachine > product.maxAcres) {
    disqualifiers.push("Derated capacity exceeds the platform's hard per-machine acreage ceiling.");
  }

  // --- Cautions ---
  const cautions: string[] = [];
  if (product.segment !== "commercial") {
    cautions.push(
      `${product.segment === "residential" ? "Residential" : "Prosumer"}-class product on a commercial site — confirm the warranty survives a commercial duty cycle.`,
    );
  }
  if (!product.specsVerified) cautions.push("All specifications are unverified placeholders.");
  if (!product.fleetManagement) cautions.push("No fleet-management platform — monitoring will be manual.");
  if (!product.apiAvailable) cautions.push("No API; telemetry cannot be pulled into our own ops tooling.");
  if (product.serviceNetwork <= 2) cautions.push("Thin service/parts network in market.");
  if (product.edgeCuttingCapability <= 2 && assessment.requiredFinishQuality >= 4) {
    cautions.push("Weak edge-cutting on a site that demands a high finish — residual trimming burden rises.");
  }
  if (g.mowingZoneCount > product.multiZoneSupport) {
    cautions.push(`${g.mowingZoneCount} zones vs ${product.multiZoneSupport} supported work areas — zones may need to be merged or a machine added.`);
  }
  if (product.navigationTech === "boundary_wire") {
    cautions.push("Boundary-wire install adds commissioning cost and materially reduces redeployability.");
  }
  if (utilizationPct < a.thresholds.minMachineUtilizationPct) {
    cautions.push(`Machine utilization of ${utilizationPct.toFixed(0)}% is below the ${a.thresholds.minMachineUtilizationPct}% floor — capital sits idle.`);
  }
  if (utilizationPct > a.thresholds.maxMachineUtilizationPct) {
    cautions.push(`Machine utilization of ${utilizationPct.toFixed(0)}% leaves no headroom for downtime or a wet week.`);
  }

  // --- Fit sub-scores ---
  const capacityFit = scaleScore(
    Math.abs(div(autonomousAcres, Math.max(1, liveMachines), 0) - effectiveAcresPerMachine),
    0,
    effectiveAcresPerMachine,
  );
  const utilization = utilizationScore(utilizationPct, a);
  const navigationFit = navigationScore(product, assessment);
  const terrainFit = clamp100(scaleScore(product.maxSlopePct - g.maxSlopePct, 25, -5));
  const finishFit = weightedAverage([
    { value: scaleScore(product.edgeCuttingCapability, 5, 1), weight: assessment.requiredFinishQuality / 5 },
    { value: product.activeTrimming ? 100 : 55, weight: 0.4 },
  ]);
  const fleetOps = weightedAverage([
    { value: product.fleetManagement ? 100 : 30, weight: 0.3 },
    { value: product.remoteDiagnostics ? 100 : 40, weight: 0.25 },
    { value: product.apiAvailable ? 100 : 55, weight: 0.15 },
    { value: scaleScore(product.serviceNetwork, 5, 1), weight: 0.3 },
  ]);
  // Cost efficiency is scored against a $1,200–$6,000 per autonomous acre band.
  const costEfficiency = scaleScore(annualCostPerAutonomousAcre, 1200, 6000);
  const commercialSuitability =
    product.segment === "commercial" ? 100 : product.segment === "prosumer" ? 55 : 20;

  const fitScore = clamp100(
    weightedAverage([
      { value: capacityFit, weight: 0.1 },
      { value: utilization, weight: 0.18 },
      { value: navigationFit, weight: 0.16 },
      { value: terrainFit, weight: 0.1 },
      { value: finishFit, weight: 0.08 },
      { value: fleetOps, weight: 0.12 },
      { value: costEfficiency, weight: 0.16 },
      { value: commercialSuitability, weight: 0.1 },
    ]) -
      cautions.length * 1.5 -
      (readinessScore < 55 && product.segment !== "commercial" ? 5 : 0),
  );

  return {
    product,
    fitScore,
    effectiveAcresPerMachine,
    derateFactor: derate,
    derateDetail,
    liveMachines,
    spareMachines,
    utilizationPct,
    annualMachineCostEach,
    annualCostPerAutonomousAcre,
    disqualifiers,
    cautions,
    subScores: {
      capacityFit,
      utilization,
      navigationFit,
      terrainFit,
      finishFit,
      fleetOps,
      costEfficiency,
      commercialSuitability,
    },
  };
}

/** Utilization is scored as a band, not "higher is better". */
function utilizationScore(utilizationPct: number, a: Assumptions): number {
  const lo = a.thresholds.minMachineUtilizationPct;
  const hi = a.thresholds.maxMachineUtilizationPct;
  if (utilizationPct >= lo && utilizationPct <= hi) return 100;
  if (utilizationPct < lo) return scaleScore(utilizationPct, lo, 0);
  return scaleScore(utilizationPct, hi, 100 + (hi - lo));
}

function navigationScore(product: MowerProduct, assessment: SiteAssessment): number {
  const r = assessment.ratings;
  const g = assessment.geometry;
  const entries: Array<{ value: number; weight: number }> = [];

  if (product.requiresRtk) entries.push({ value: ratingToScore(r.gpsRtkVisibility), weight: 0.4 });
  else entries.push({ value: 85, weight: 0.4 }); // wire/vision platforms are insensitive to sky view

  if (product.requiresCellular) entries.push({ value: ratingToScore(r.cellularConnectivity), weight: 0.2 });
  else entries.push({ value: 80, weight: 0.2 });

  // Obstacle-dense sites need real perception, not a bump sensor.
  const perception =
    product.obstacleDetection === "vision_lidar"
      ? 100
      : product.obstacleDetection === "vision"
        ? 85
        : product.obstacleDetection === "ultrasonic"
          ? 65
          : product.obstacleDetection === "bump"
            ? 40
            : 20;
  const perceptionNeed = clamp((6 - r.obstacleDensity) / 5, 0.2, 1);
  entries.push({ value: perception, weight: 0.25 * perceptionNeed + 0.1 });

  // Zone handling
  entries.push({
    value: scaleScore(product.multiZoneSupport - g.mowingZoneCount, 4, -4),
    weight: 0.15,
  });

  return weightedAverage(entries);
}

function buildRationale(
  recommended: ProductEvaluation | null,
  alternative: ProductEvaluation | null,
  assessment: SiteAssessment,
  autonomousAcres: number,
  liveMachines: number,
  spareMachines: number,
  a: Assumptions,
): string[] {
  if (!recommended) return ["No product could be evaluated — check that the equipment catalog is populated."];
  const p = recommended.product;
  const out: string[] = [];

  out.push(
    `${p.manufacturer} ${p.model} is matched on fit, not raw acreage: its ${p.recommendedAcres.toFixed(1)} ac rating derates to ${recommended.effectiveAcresPerMachine.toFixed(2)} ac at this site (x${recommended.derateFactor.toFixed(2)}) once fragmentation, obstacle density, slope headroom and ground quality are applied.`,
  );
  out.push(
    `${autonomousAcres.toFixed(2)} autonomous acres / ${recommended.effectiveAcresPerMachine.toFixed(2)} ac per machine = ${liveMachines} live machine(s) at ${recommended.utilizationPct.toFixed(0)}% utilization, plus ${spareMachines} spare(s) at a ${(a.fleetOpex.spareRatio * 100).toFixed(0)}% spare ratio.`,
  );
  out.push(
    `Navigation fit ${recommended.subScores.navigationFit.toFixed(0)}/100 (${p.navigationTech.replace(/_/g, " ")}${p.requiresRtk ? ", RTK required" : ""}), terrain fit ${recommended.subScores.terrainFit.toFixed(0)}/100, fleet supportability ${recommended.subScores.fleetOps.toFixed(0)}/100, annualized cost ${Math.round(recommended.annualCostPerAutonomousAcre).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} per autonomous acre.`,
  );
  if (assessment.requiredFinishQuality >= 4) {
    out.push(
      `Site demands a ${assessment.requiredFinishQuality}/5 finish; this platform rates ${p.edgeCuttingCapability}/5 on edge cutting${p.activeTrimming ? " and does perform active trimming" : " and does not actively trim, so perimeter work stays manual"}.`,
    );
  }
  if (alternative) {
    out.push(
      `Alternative: ${alternative.product.manufacturer} ${alternative.product.model} (fit ${alternative.fitScore.toFixed(0)}/100, ${alternative.liveMachines} machine(s))${alternative.disqualifiers.length ? ` — currently disqualified: ${alternative.disqualifiers[0]}` : ""}.`,
    );
  }
  out.push("All catalog specifications are placeholders and must be verified against OEM datasheets and a dealer quote before this recommendation is used commercially.");
  return out;
}
