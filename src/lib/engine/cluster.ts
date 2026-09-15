import type { Assumptions, ClusterClassification, ClusterInputs } from "@/lib/types";
import { clamp100, div, scaleScore, weightedAverage } from "./util";

export interface ClusterResult {
  score: number;
  classification: ClusterClassification;
  components: {
    proximity: number;
    machineDensity: number;
    acreDensity: number;
    travelEfficiency: number;
  };
  /** Weighted machine count across the radius bands. */
  weightedMachineCount: number;
  strengthensExistingCluster: boolean;
  drivers: string[];
  risks: string[];
}

/**
 * Cluster score, 0–100. Service density drives technician utilization, which is
 * the single largest controllable cost line in a resident-robot operation.
 */
export function computeClusterScore(input: ClusterInputs, a: Assumptions): ClusterResult {
  const c = a.cluster;

  // Proximity: co-located sites score 100, isolated sites score 0.
  const proximity = scaleScore(input.distanceToNearestDeploymentMiles, c.denseDistanceMiles, c.isolatedDistanceMiles);

  // Machine density: nearer machines count more toward a real service route.
  const weightedMachineCount =
    input.machinesWithin5Miles * c.radiusWeights.r5 +
    input.machinesWithin10Miles * c.radiusWeights.r10 +
    input.machinesWithin15Miles * c.radiusWeights.r15 +
    input.machinesWithin25Miles * c.radiusWeights.r25 +
    input.machinesWithin50Miles * c.radiusWeights.r50;
  const machineDensity = scaleScore(weightedMachineCount, c.denseMachineCount, 0);

  // Acre density: an existing autonomous acre base means the route already pays for itself.
  const acreDensity = scaleScore(input.autonomousAcresInCluster, 60, 0);

  // Travel efficiency: 10 minutes is excellent, 75 minutes is a route-killer.
  const travelEfficiency = scaleScore(input.technicianTravelMinutes, 10, 75);

  const score = clamp100(
    weightedAverage([
      { value: proximity, weight: 0.3 },
      { value: machineDensity, weight: 0.3 },
      { value: acreDensity, weight: 0.15 },
      { value: travelEfficiency, weight: 0.25 },
    ]),
  );

  let classification: ClusterClassification;
  if (input.strategicException) classification = "strategic_exception";
  else if (score >= c.denseScoreMin) classification = "dense_highly_additive";
  else if (score >= c.buildingScoreMin) classification = "building_density";
  else classification = "isolated";

  const strengthensExistingCluster =
    input.distanceToNearestDeploymentMiles <= c.isolatedDistanceMiles && input.machinesWithin25Miles > 0;

  const drivers: string[] = [];
  const risks: string[] = [];

  if (input.distanceToNearestDeploymentMiles <= c.denseDistanceMiles) {
    drivers.push(
      `Nearest existing deployment is ${input.distanceToNearestDeploymentMiles} mi away — this site drops into an existing route.`,
    );
  } else if (input.distanceToNearestDeploymentMiles >= c.isolatedDistanceMiles) {
    risks.push(
      `Nearest existing deployment is ${input.distanceToNearestDeploymentMiles} mi away — every dispatch is a dedicated trip.`,
    );
  }

  if (input.machinesWithin25Miles >= c.denseMachineCount) {
    drivers.push(`${input.machinesWithin25Miles} machines already within 25 mi support a standing service route.`);
  } else if (input.machinesWithin25Miles < c.buildingMachineCount) {
    risks.push(`Only ${input.machinesWithin25Miles} machines within 25 mi — technician time cannot be amortized yet.`);
  }

  if (input.technicianTravelMinutes > 45) {
    risks.push(
      `${input.technicianTravelMinutes} min one-way travel means roughly ${div(input.technicianTravelMinutes * 2, 60).toFixed(1)} hours of paid drive time per dispatch.`,
    );
  }

  if (input.strategicException) {
    drivers.push(
      `Flagged as a strategic exception: ${input.strategicExceptionRationale || "no rationale recorded"}.`,
    );
  }

  return {
    score,
    classification,
    components: { proximity, machineDensity, acreDensity, travelEfficiency },
    weightedMachineCount,
    strengthensExistingCluster,
    drivers,
    risks,
  };
}
