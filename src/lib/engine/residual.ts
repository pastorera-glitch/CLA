import type { PropertyIntake, ResidualScope, ResidualServiceLine, SiteAssessment } from "@/lib/types";
import { RESIDUAL_OWNER_LABELS, RESIDUAL_SERVICE_LABELS } from "@/lib/types";
import { clamp100, div } from "./util";

export interface ResidualResult {
  /** Incumbent mowing spend robotics actually displaces. */
  replacedIncumbentMowingSpend: number;
  /** Incumbent mowing spend that stays with a human crew. */
  retainedIncumbentMowingSpend: number;
  replacedPct: number;
  perimeterManualFinishPct: number;
  perimeterLinearFeetRequiringFinish: number;
  /** Rough annual hours of manual perimeter finishing left on the site. */
  estimatedResidualTrimHoursPerYear: number;
  linesInScope: ResidualServiceLine[];
  linesOutOfScope: ResidualServiceLine[];
  /** Residual landscaping spend that is neither our revenue nor our cost. */
  residualLandscapingAnnualSpend: number;
  siteOperatingArchitecture: string[];
  warnings: string[];
}

/**
 * Residual landscaping assessment.
 *
 * Deliberately kept OUT of operator revenue and operator cost. It is reported
 * as part of the site's operating architecture so the evaluator can see who is
 * still on site and what the customer still pays for.
 */
export function computeResidual(
  residual: ResidualScope,
  assessment: SiteAssessment,
  intake: PropertyIntake,
  mowingOnlyCost: number,
  annualMowingVisits: number,
): ResidualResult {
  const replacedPct = clamp100(residual.incumbentMowingScopeReplacedPct);
  const replacedIncumbentMowingSpend = (mowingOnlyCost * replacedPct) / 100;
  const retainedIncumbentMowingSpend = mowingOnlyCost - replacedIncumbentMowingSpend;

  const perimeterManualFinishPct = clamp100(assessment.perimeterManualFinishPct);
  const perimeterLinearFeetRequiringFinish =
    (assessment.geometry.turfPerimeterLinearFeet * perimeterManualFinishPct) / 100;

  // Planning rate: ~450 linear feet of string trimming per labor hour, per visit.
  const TRIM_FEET_PER_HOUR = 450;
  const estimatedResidualTrimHoursPerYear =
    div(perimeterLinearFeetRequiringFinish, TRIM_FEET_PER_HOUR, 0) * Math.max(0, annualMowingVisits);

  const linesInScope = residual.lines.filter((l) => l.inIncumbentScope);
  const linesOutOfScope = residual.lines.filter((l) => !l.inIncumbentScope);
  const residualLandscapingAnnualSpend = linesInScope
    .filter((l) => l.owner !== "not_required" && l.owner !== "operator")
    .reduce((sum, l) => sum + Math.max(0, l.estimatedAnnualCost), 0);

  const siteOperatingArchitecture: string[] = [];
  siteOperatingArchitecture.push(
    `We provide autonomous mowing on ${replacedPct.toFixed(0)}% of the incumbent mowing scope (${money(replacedIncumbentMowingSpend)} of ${money(mowingOnlyCost)} in mowing-only spend).`,
  );
  if (retainedIncumbentMowingSpend > 0) {
    siteOperatingArchitecture.push(
      `${money(retainedIncumbentMowingSpend)} of mowing scope stays with a human crew — the turf robots cannot reach or finish.`,
    );
  }
  siteOperatingArchitecture.push(
    `Roughly ${Math.round(perimeterLinearFeetRequiringFinish).toLocaleString()} linear feet of perimeter still need manual finishing, about ${estimatedResidualTrimHoursPerYear.toFixed(0)} labor hours per season at ${TRIM_FEET_PER_HOUR} ft/hr.`,
  );
  siteOperatingArchitecture.push(
    residual.landscaperRemainsOnsite
      ? `${intake.existingLandscaper || "The existing landscaper"} remains on site: ${RESIDUAL_SERVICE_LABELS[linesInScope[0]?.service ?? "other"]}${linesInScope.length > 1 ? ` and ${linesInScope.length - 1} other service line(s)` : ""}.`
      : "No landscaper remains on site under the proposed architecture — confirm who performs residual work.",
  );
  if (residual.landscaperCanSupportRobots) {
    siteOperatingArchitecture.push(
      `Existing landscaper is a candidate for defined robot-support tasks (role: ${residual.landscaperRole.replace(/_/g, " ")}), which would cut our dispatch travel materially.`,
    );
  }
  siteOperatingArchitecture.push(
    `Residual landscaping of roughly ${money(residualLandscapingAnnualSpend)}/yr is shown for completeness only. It is not booked as our revenue or our cost.`,
  );

  const warnings: string[] = [];
  if (replacedPct < 60) {
    warnings.push(
      `Robotics only replaces ${replacedPct.toFixed(0)}% of the mowing scope, so the customer keeps a mowing vendor. Savings and vendor-consolidation arguments both weaken.`,
    );
  }
  if (perimeterManualFinishPct > 50) {
    warnings.push(
      `${perimeterManualFinishPct.toFixed(0)}% of perimeter still needs a trimmer — a crew is still visiting the property on a regular cadence.`,
    );
  }
  if (!residual.landscaperRemainsOnsite && linesInScope.length > 2) {
    warnings.push(
      `${linesInScope.length} residual service lines are in the incumbent scope but no landscaper is retained. Someone has to do this work.`,
    );
  }
  const unassigned = linesInScope.filter((l) => l.owner === "operator");
  if (unassigned.length > 0) {
    warnings.push(
      `${unassigned.length} residual line(s) are assigned to us (${unassigned.map((l) => RESIDUAL_SERVICE_LABELS[l.service]).join(", ")}). These sit outside the base robotic scope and need separate pricing.`,
    );
  }

  return {
    replacedIncumbentMowingSpend,
    retainedIncumbentMowingSpend,
    replacedPct,
    perimeterManualFinishPct,
    perimeterLinearFeetRequiringFinish,
    estimatedResidualTrimHoursPerYear,
    linesInScope,
    linesOutOfScope,
    residualLandscapingAnnualSpend,
    siteOperatingArchitecture,
    warnings,
  };
}

export function residualOwnerLabel(line: ResidualServiceLine): string {
  return RESIDUAL_OWNER_LABELS[line.owner];
}

function money(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
