import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_ASSUMPTIONS, cloneAssumptions } from "@/lib/assumptions";
import { SEED_PRODUCTS } from "@/data/products";
import { seedProperties } from "@/data/seed-properties";
import { createEmptyProperty } from "@/lib/defaults";
import { portfolioRollup, runUnderwriting, summarize } from "@/lib/engine";
import { capitalRecoveryFactor, normalizeShares, ratingToScore, scaleScore } from "@/lib/engine/util";

const A = DEFAULT_ASSUMPTIONS;
const [dense, fragmented, campus] = seedProperties();

test("util: rating and scale helpers behave at the boundaries", () => {
  assert.equal(ratingToScore(1), 0);
  assert.equal(ratingToScore(5), 100);
  assert.equal(ratingToScore(3), 50);
  assert.equal(scaleScore(5, 10, 0), 50);
  assert.equal(scaleScore(-5, 10, 0), 0);
  assert.equal(scaleScore(99, 10, 0), 100);
  // A 10% / 5-year capital recovery factor is ~0.2638.
  assert.ok(Math.abs(capitalRecoveryFactor(10, 5) - 0.26379) < 0.0005);
  const shares = normalizeShares({ a: 1, b: 3 });
  assert.equal(Math.round(shares.a + shares.b), 100);
  assert.equal(shares.a, 25);
});

test("readiness weights are normalized even when they do not sum to 100", () => {
  const a = cloneAssumptions(A);
  for (const k of Object.keys(a.readinessWeights) as Array<keyof typeof a.readinessWeights>) {
    a.readinessWeights[k] = a.readinessWeights[k] * 2;
  }
  const doubled = runUnderwriting(dense, SEED_PRODUCTS, a);
  const base = runUnderwriting(dense, SEED_PRODUCTS, A);
  assert.ok(Math.abs(doubled.readiness.score - base.readiness.score) < 0.001);
});

test("every seeded property runs end to end and stays in range", () => {
  for (const p of seedProperties()) {
    const r = runUnderwriting(p, SEED_PRODUCTS, A);
    assert.ok(r.readiness.score >= 0 && r.readiness.score <= 100, `${p.intake.name} readiness in range`);
    assert.ok(r.cluster.score >= 0 && r.cluster.score <= 100);
    assert.ok(r.recommendation.opportunityScore >= 0 && r.recommendation.opportunityScore <= 100);
    assert.ok(Number.isFinite(r.economics.contribution));
    assert.ok(Number.isFinite(r.economics.contributionMarginPct));
    assert.ok(r.equipment.recommended !== null);
    assert.ok(r.equipment.liveMachines >= 1);
    assert.ok(r.value.recommendedAnnualPrice > 0);
  }
});

test("a blank property does not divide by zero", () => {
  const blank = createEmptyProperty("blank");
  const r = runUnderwriting(blank, SEED_PRODUCTS, A);
  assert.ok(Number.isFinite(r.readiness.score));
  assert.ok(Number.isFinite(r.economics.contributionMarginPct));
  assert.equal(r.equipment.autonomousAcres, 0);
});

test("the dense industrial site outscores the fragmented retail site", () => {
  const d = runUnderwriting(dense, SEED_PRODUCTS, A);
  const f = runUnderwriting(fragmented, SEED_PRODUCTS, A);
  assert.ok(d.readiness.score > f.readiness.score);
  assert.ok(d.cluster.score > f.cluster.score);
  assert.ok(d.recommendation.opportunityScore > f.recommendation.opportunityScore);
});

test("better readiness produces a lower predicted intervention rate", () => {
  const d = runUnderwriting(dense, SEED_PRODUCTS, A);
  const f = runUnderwriting(fragmented, SEED_PRODUCTS, A);
  assert.ok(d.intervention.readinessMultiplier < f.intervention.readinessMultiplier);
  assert.ok(
    d.intervention.modelPredictedPhysicalPerMachineMonth < f.intervention.modelPredictedPhysicalPerMachineMonth,
  );
});

test("commissioning burden exceeds stabilized burden", () => {
  const r = runUnderwriting(campus, SEED_PRODUCTS, A);
  assert.ok(r.intervention.commissioningYear.totalHumanHours > r.intervention.stabilized.totalHumanHours);
  assert.ok(r.economics.commissioningYearContribution < r.economics.contribution);
});

test("the large campus needs more than one machine", () => {
  const r = runUnderwriting(campus, SEED_PRODUCTS, A);
  assert.ok(r.equipment.liveMachines > 1, `expected multiple machines, got ${r.equipment.liveMachines}`);
  assert.ok(r.equipment.spareMachines >= 1);
});

test("equipment matching does not just pick the largest acreage rating", () => {
  const r = runUnderwriting(fragmented, SEED_PRODUCTS, A);
  const biggest = [...SEED_PRODUCTS].sort((a, b) => b.maxAcres - a.maxAcres)[0];
  assert.notEqual(r.equipment.recommended?.product.id, biggest.id);
});

test("shorter contracts require more annualized revenue than longer ones", () => {
  const r = runUnderwriting(dense, SEED_PRODUCTS, A);
  const byStructure = Object.fromEntries(
    r.contract.structureComparison.map((o) => [o.structure, o.requiredTotalAnnualizedPrice]),
  );
  assert.ok(byStructure.thirty_day_cancellable > byStructure.three_season);
  assert.ok(byStructure.half_season_pilot > byStructure.full_season);
  assert.ok(byStructure.full_season > byStructure.three_season);
});

test("an upfront deployment fee lowers the required recurring price", () => {
  const r = runUnderwriting(dense, SEED_PRODUCTS, A);
  const upfront = r.contract.mechanismComparison.find((o) => o.mechanism === "A_upfront_deployment_fee")!;
  const allIn = r.contract.mechanismComparison.find((o) => o.mechanism === "B_all_inclusive_recurring")!;
  assert.ok(upfront.upfrontCustomerFee > 0);
  assert.ok(upfront.requiredAnnualRecurringPrice < allIn.requiredAnnualRecurringPrice);
});

test("pricing at the target margin reproduces the target margin", () => {
  const p = structuredClone(dense);
  p.contract.mechanism = "B_all_inclusive_recurring";
  const base = runUnderwriting(p, SEED_PRODUCTS, A);
  p.economics.annualPriceOverride = base.contract.selected.requiredAnnualRecurringPrice;
  p.economics.implementationFeeOverride = 0;
  p.economics.otherServiceRevenue = 0;
  const r = runUnderwriting(p, SEED_PRODUCTS, A);
  assert.ok(
    Math.abs(r.economics.contributionMarginPct - A.thresholds.targetContributionMarginPct) < 0.5,
    `expected ~${A.thresholds.targetContributionMarginPct}%, got ${r.economics.contributionMarginPct.toFixed(2)}%`,
  );
});

test("a multi-season discount never prices below the structure's own cost floor", () => {
  const r = runUnderwriting(dense, SEED_PRODUCTS, A);
  for (const structure of ["half_season_pilot", "full_season", "two_season", "three_season"] as const) {
    const p = structuredClone(dense);
    p.contract.structure = structure;
    p.contract.mechanism = "D_multi_season_discount";
    const discounted = runUnderwriting(p, SEED_PRODUCTS, A);
    p.contract.mechanism = "B_all_inclusive_recurring";
    const allIn = runUnderwriting(p, SEED_PRODUCTS, A);
    assert.ok(
      discounted.contract.selected.requiredAnnualRecurringPrice >=
        allIn.contract.selected.requiredAnnualRecurringPrice - 0.01,
      `${structure}: discounted price fell below its own floor`,
    );
  }
  assert.ok(r.contract.selected.requiredAnnualRecurringPrice > 0);
});

test("the P&L balances: revenue - cost = contribution", () => {
  for (const p of seedProperties()) {
    const r = runUnderwriting(p, SEED_PRODUCTS, A);
    const revenue = r.economics.revenue.lines.reduce((s, l) => s + l.amount, 0);
    const cost = r.economics.cost.lines.reduce((s, l) => s + l.amount, 0);
    assert.ok(Math.abs(revenue - r.economics.revenue.total) < 0.01);
    assert.ok(Math.abs(cost - r.economics.cost.total) < 0.01);
    assert.ok(Math.abs(revenue - cost - r.economics.contribution) < 0.01);
  }
});

test("residual landscaping never lands in operator revenue or cost", () => {
  const r = runUnderwriting(campus, SEED_PRODUCTS, A);
  assert.ok(r.residual.residualLandscapingAnnualSpend > 0);
  const anyLine = [...r.economics.revenue.lines, ...r.economics.cost.lines].some(
    (l) => Math.abs(l.amount - r.residual.residualLandscapingAnnualSpend) < 0.01,
  );
  assert.equal(anyLine, false);
});

test("no site is auto-rejected without flags explaining why", () => {
  const f = runUnderwriting(fragmented, SEED_PRODUCTS, A);
  assert.ok(f.readiness.flags.length > 0);
  assert.ok(f.recommendation.majorRisks.length > 0);
  assert.ok(f.recommendation.whatCouldBreakTheModel.length > 0);
});

test("a decision override wins over the derived decision", () => {
  const p = structuredClone(dense);
  p.decisionOverride = "reject";
  const r = runUnderwriting(p, SEED_PRODUCTS, A);
  assert.equal(r.recommendation.decision, "reject");
  assert.equal(r.recommendation.decisionIsOverridden, true);
});

test("editable thresholds actually move the verdict", () => {
  const a = cloneAssumptions(A);
  a.thresholds.targetContributionMarginPct = 99;
  a.thresholds.conditionalContributionMarginPct = 98;
  a.thresholds.rejectContributionMarginPct = 98;
  const r = runUnderwriting(dense, SEED_PRODUCTS, a);
  assert.equal(r.economics.underwritingVerdict, "watch");
});

test("an unsellable price drags the opportunity score and the decision", () => {
  const f = runUnderwriting(fragmented, SEED_PRODUCTS, A);
  assert.equal(f.value.priceSource, "cost_floor");
  assert.ok(f.value.savingsPct < 0);
  assert.equal(f.recommendation.decision, "reject");
  const priceComponent = f.recommendation.opportunityComponents.find((c) => c.label === "Price acceptability")!;
  assert.equal(priceComponent.score, 0);
});

test("opportunity component weights sum to 1", () => {
  const r = runUnderwriting(dense, SEED_PRODUCTS, A);
  const total = r.recommendation.opportunityComponents.reduce((s, c) => s + c.weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `weights sum to ${total}`);
});

test("portfolio rollup aggregates the seeded book", () => {
  const summaries = seedProperties().map((p) => summarize(runUnderwriting(p, SEED_PRODUCTS, A)));
  const roll = portfolioRollup(summaries);
  assert.equal(roll.propertyCount, 3);
  assert.ok(roll.totalAutonomousAcres > 25);
  assert.ok(roll.totalAnnualRevenue > 0);
  assert.ok(Number.isFinite(roll.blendedMarginPct));
});
