# Calculation Methodology

Every formula below lives in `src/lib/engine/` and reads its constants from `Assumptions`.
Nothing is hardcoded; nothing is a black box.

---

## 1. Cluster Score (`cluster.ts`)

Four components, weighted:

| Component | Weight | Formula |
| --- | --- | --- |
| Proximity | 30% | `scaleScore(distanceToNearest, denseDistanceMiles → 100, isolatedDistanceMiles → 0)` |
| Machine density | 30% | Radius-weighted machine count (5 mi ×0.40, 10 mi ×0.25, 15 mi ×0.15, 25 mi ×0.12, 50 mi ×0.08) scaled against `denseMachineCount` |
| Travel efficiency | 25% | `scaleScore(travelMinutes, 10 → 100, 75 → 0)` |
| Acre density | 15% | `scaleScore(autonomousAcresInCluster, 60 → 100, 0 → 0)` |

Nearer machines are weighted harder because only they can actually share a service route.

**Classification**: `strategicException` (manual) → *Strategic exception*; else score ≥
`denseScoreMin` → *Dense / highly additive*; ≥ `buildingScoreMin` → *Building density*; else
*Isolated*.

---

## 2. Robot Readiness Score (`readiness.ts`)

Nine categories, each scored 0–100, then weighted. **Weights are normalized**, so an edited
weight set that does not sum to 100 still produces a correct score.

| Category | Default weight | Sub-score |
| --- | --- | --- |
| Autonomous turf compatibility | 25% | `autonomousCompatiblePct` applied directly |
| Turf geometry / fragmentation | 15% | 35% contiguous share + 25% acres-per-zone (1.5 ac/zone = 100) + 15% largest-zone share + 25% fragmentation rating |
| Obstacles and crossings | 10% | 40% weighted crossings per acre (road ×2.5, narrow passage ×1.5, sidewalk ×1.0, gate ×0.75) + 30% fixed-obstacle density + 20% obstacle rating + 10% edge rating |
| Connectivity / localization | 10% | 60% GPS/RTK visibility + 40% cellular |
| Terrain / slope / drainage | 10% | 30% slope rating + 20% max grade (10% = 100, 55% = 0) + 10% steep-area density + 20% ground quality + 20% drainage |
| Public interaction / security | 10% | 30% pedestrian + 30% vehicle + 40% vandalism/theft |
| Charging / infrastructure | 5% | Charging-station suitability rating |
| Residual manual finishing | 5% | 60% inverse of perimeter-finish % + 25% edge complexity + 15% inverse of required finish quality |
| Geographic cluster | 10% | Cluster score carried in |

A 1–5 rating maps to `(rating − 1) / 4 × 100`.

**Bands** (editable): ≥85 Strong Candidate · ≥70 Candidate / Requires Review · ≥55 Conditional
· below 55 Poor Candidate.

**Flags, not rejections.** No site is ever auto-rejected by this module. Instead it emits
`critical` / `major` / `watch` flags naming the specific reason — a category under 40 or 60, a
sub-60% autonomous share, RTK or cellular ≤ 2, vandalism exposure ≤ 2, any road crossing, a
grade over 45%, chronic wet areas, over 60% perimeter finishing, an isolated cluster, or more
than eight zones. Categories are also ranked by **points lost** so the evaluator sees what is
actually holding the site back rather than a bare number.

---

## 3. Equipment Matching (`equipment.ts`)

**This is explicitly not "pick the biggest acreage rating."**

### Step 1 — derate catalog capacity to this site

```
derate = fragmentationFactor × obstacleFactor × slopeHeadroomFactor × groundFactor   (clamped 0.30–1.00)

fragmentationFactor  = clamp(0.60 + acresPerZone / 3.75, 0.60, 1)   applied when acresPerZone < 1.5
obstacleFactor       = clamp(0.65 + obstacleRatingScore × 0.35, 0.65, 1)
slopeHeadroomFactor  = clamp(0.70 + (productMaxSlope − siteMaxSlope)/productMaxSlope × 0.30, 0.70, 1)
groundFactor         = clamp(0.80 + groundQualityScore × 0.20, 0.80, 1)

effectiveAcres = recommendedAcres × derate
liveMachines   = ceil(autonomousAcres / effectiveAcres)
spares         = max(ceil(live × spareRatio), live ≥ threshold ? 1 : 0)
utilization    = autonomousAcres / (live × effectiveAcres)
```

Each derate factor is reported to the UI as its own line, so a machine count can be traced
back to the site condition that drove it.

### Step 2 — hard disqualifiers

Site grade over the platform's rating; RTK required with sky view ≤ 2; cellular required with
signal ≤ 1; zone count more than double the platform's work-area support; derated capacity
above the hard per-machine ceiling. Any disqualifier sorts a product below every clean
product regardless of fit score.

### Step 3 — fit score (0–100, weighted)

| Sub-score | Weight | Note |
| --- | --- | --- |
| Utilization | 18% | Scored as a **band**, not "higher is better" — 100 inside the 55–92% target, falling off on both sides |
| Cost efficiency | 16% | Annualized machine cost per autonomous acre, scored across a $1,200–$6,000 band |
| Navigation fit | 16% | RTK need vs sky view, cellular need vs signal, perception class weighted by obstacle density, zone headroom |
| Fleet operations | 12% | Fleet management, remote diagnostics, API, service network |
| Capacity fit | 10% | How cleanly the acreage divides into whole machines |
| Terrain fit | 10% | Slope headroom |
| Commercial suitability | 10% | Commercial 100 / prosumer 55 / residential 20 |
| Finish fit | 8% | Edge-cutting capability weighted by required finish quality; active trimming |

Minus 1.5 points per caution, minus 5 for a non-commercial product on a sub-55 readiness site.

**Cautions** (soft) cover: non-commercial segment on a commercial site, unverified specs, no
fleet management, no API, thin service network, weak edge cutting against a high finish
demand, zone count above supported work areas, boundary-wire install (commissioning cost and
redeployability), and utilization outside the target band.

---

## 4. Intervention / Human-in-the-Loop (`intervention.ts`)

```
readinessMultiplier = clamp(1 + sensitivity × (referenceScore − readinessScore) / 25,
                            minMultiplier, maxMultiplier)

predictedPhysicalPerMachineMonth = baselinePhysical × readinessMultiplier
predictedRemotePerMachineMonth   = baselineRemote   × readinessMultiplier
```

With the defaults (baseline 1.0, reference 75, sensitivity 0.45, clamp 0.45–2.60): a readiness
of 100 yields ×0.55, a readiness of 50 yields ×1.45. **Better sites therefore produce lower
expected intervention rates**, which is the required behavior, achieved through one visible
line of arithmetic the operator can edit or switch off entirely
(`useModelPredictedRate = false` uses manually entered observed rates instead).

Downtime is loaded on top: `uptimeLoadFactor = 1 + (1 − uptimeFrac) × 1.5`.

```
bladeChangesPerMachineYear = machineOperatingHours / bladeServiceIntervalHours
scheduledPerMachineYear    = max(plannedVisits, bladeChangesPerMachineYear)

fieldHoursPerMachineYear = physicalPerYear × avgPhysicalHours
                         + scheduledPerYear × avgScheduledHours
remoteHoursTotal         = remotePerYear × avgRemoteHours × totalMachines   (spares included)

unplannedTrips  = physicalPerYear × liveMachines × tripBatchingFactor
scheduledTrips  = scheduledPerYear                  (one routed visit covers every machine)
travelHours     = (unplannedTrips + scheduledTrips) × avgTravelHours × 2    (round trip)
```

**Commissioning year** blends the elevated rate over the commissioning window:
`blend = (commMonths × multiplier + (12 − commMonths) × 1) / 12`.

Interventions are then split across the nine categories using the normalized `categoryMix`.

---

## 5. Capital and Deployment (`capital.ts`)

```
fleetAcquisition   = acquisitionCost × totalMachines          (live + spares)
fleetResidual      = fleetAcquisition × residualValuePct
pvResidual         = fleetResidual / (1 + costOfCapital)^usefulLife

machineAnnualEconomicCost = (fleetAcquisition − pvResidual) × CRF(costOfCapital, usefulLife)
```

`CRF(r, n) = r(1+r)^n / ((1+r)^n − 1)`. This single line covers economic depreciation **and**
the capital charge, so the P&L never double-counts them.

Financing is booked as the **spread only** — `max(0, leasePayment − machineAnnualEconomicCost)`
— for the same reason.

Deployment builds up from hours and materials, and scales with **live** machines only (spares
are not commissioned on site):

```
hours    = siteSurvey + commissioningPerMachine × live
         + hoursPerAdditionalZone × (zones − 1) + hoursPerCrossing × crossings
cost     = hours × burdenedTechRate + installMaterials × live
         + chargingStation × live + (requiresRtk ? rtkBaseStation : 0) + mobilization
```

Upfront operator capital is `deployment + fleetAcquisition` when paying cash, or `deployment`
alone when financing.

---

## 6. Operating Cost (`opex.ts`)

Monitoring/connectivity, insurance (% of deployed capital), repairs (% of capital),
consumables + blade sets, battery reserve (% of capital), physical intervention labor,
remote monitoring labor, travel, storage/winterization, and a **spare-fleet allocation** line.

Spares are costed once, in that dedicated line (insurance + battery reserve on spare capital,
plus storage and half monitoring). Everything else is costed on live machines only, so no
machine is charged twice.

---

## 7. Contract and Capital-Risk Pricing (`contract.ts`)

Every combination of **six structures × six mechanisms** is priced.

```
committedSeasons: half-season 0.5 · full 1 · two 2 · three 3 · 30-day cancellable 0.25 · custom N

deploymentAtRisk         = deploymentTotal − upfrontCustomerFee
deploymentRecoveryYears  = mechanism ∈ {E, F} ? max(seasons, usefulLife) : max(0.25, seasons)
deploymentRecoveryAnnual = deploymentAtRisk / deploymentRecoveryYears
```

Termination is modeled **at the midpoint of the committed term**:

```
unamortizedDeployment = deploymentAtRisk × (1 − recoveredFraction)
idleCarryingCost      = machineAnnualEconomicCost / 12 × redeploymentIdleMonths
expectedUnrecovered   = unamortizedDeployment + redeploymentCost × machines + idleCarryingCost

flexibilityPremium    = P(termination) × expectedUnrecovered × riskBorneFraction / seasons
```

Residual machine value at termination is reported **separately and is not a loss** — machines
are redeployable. What is lost is site-specific deployment labor, the cost of pulling and
re-commissioning elsewhere, and the capital charge while the fleet sits idle.

### Required price

```
annualCostBase = operatingCost + machineEconomicCost + financingSpread
               + deploymentRecoveryAnnual + flexibilityPremium

requiredPrice  = annualCostBase / (1 − targetMarginFrac − variableAdminFrac)
```

Solving in one step accounts for administration scaling with revenue.

### The six mechanisms

| | Upfront | Deployment recovered over | Risk premium | Recurring adjustment |
| --- | --- | --- | --- | --- |
| **A** Upfront deployment fee | `coverage% × deployment` | contract term (uncovered part) | on the uncovered part only | — |
| **B** All-inclusive recurring | none | contract term | full | — |
| **C** Higher short-term rate | none | contract term | full | `+uplift% ÷ seasons` |
| **D** Multi-season discount | none | contract term | full | discounted from the **one-season list rate**, floored at this structure's own cost floor |
| **E** Early-termination charge | none | **useful life** | only the uncollectible share | charge = unamortized deployment + redeployment |
| **F** Probabilistic risk pricing | none | **useful life** | full, itemized | — |

D is floored deliberately: a multi-season discount rewards commitment without ever pricing
below the structure's own cost floor (verified by test).

This structure makes the central point visible: with the seeded assumptions, a 30-day
cancellable structure requires roughly **80–90% more annualized revenue** than a three-season
commitment to reach the same contribution margin. That gap is the price of contractual
flexibility, not a markup.

---

## 8. Residual Landscaping (`residual.ts`)

```
replacedIncumbentSpend = mowingOnlyCost × incumbentMowingScopeReplacedPct
retainedSpend          = mowingOnlyCost − replacedIncumbentSpend
perimeterNeedingFinish = turfPerimeterLF × perimeterManualFinishPct
residualTrimHours      = perimeterNeedingFinish / 450 ft-per-hour × annualMowingVisits
```

**Residual landscaping spend is never booked as operator revenue or operator cost.** It is
reported as part of the site operating architecture. A regression test asserts that no P&L
line ever equals the residual spend figure. Counting it would flatter every deal on the
platform; it is the customer's spend with someone else.

---

## 9. Customer Value (`value.ts`)

All four approaches are priced against the **replaced** incumbent spend, not the whole
landscaping contract:

| Approach | Default target |
| --- | --- |
| Value pricing | 7.5% customer savings (near parity) |
| Volume / switcher | 17.5% savings |
| Premium pilot | −5% (a 5% premium) |
| Custom | operator-entered, may be negative |

```
approachPrice = replacedIncumbentSpend × (1 − targetSavings)
```

Each approach is tested against the cost floor from the contract module. The quoted price is
the manual override if set, else the selected approach's price if it clears the floor, else
**the floor itself** — with an explicit warning that the deal does not clear underwriting at
the intended savings level. The model does **not** assume a customer needs a 15% discount.

---

## 10. Operator Economics (`economics.ts`)

Revenue: robotic mowing service, implementation fee (amortized over the committed term so
structures are comparable), other service revenue.

Cost, fifteen lines, each carrying its own derivation string: machine annual economic cost,
financing/lease spread, deployment/commissioning, monitoring/connectivity, insurance, repairs,
consumables, battery reserve, physical intervention labor, remote monitoring labor, travel,
storage/winterization, spare-fleet allocation, variable administration, expected
redeployment/termination risk.

```
contribution        = revenue − totalDirectCost
contributionMargin  = contribution / revenue
perAcre / perMachine / perTechnicianHour
upfrontCapital      = operatorCapital − implementationFee
payback             = upfrontCapital / contribution
breakEven           = season-adjusted calendar date (contribution accrues in season only)
```

A test asserts `Σ revenue − Σ cost = contribution` on every seeded property, and a second
test asserts that pricing at the computed floor reproduces the target margin to within 0.5pp.

**Verdict** (editable): ≥35% Target · 25–35% Conditional · below 25% Watch / generally reject.

---

## 11. Opportunity Score and Decision (`recommendation.ts`)

| Component | Weight |
| --- | --- |
| Contribution margin | 25% |
| Price acceptability (savings vs. the premium tolerance) | 15% |
| Pricing headroom (incumbent spend per autonomous acre) | 15% |
| Cluster fit | 15% |
| Machine utilization (distance from 78%) | 12% |
| Deployment scale (autonomous acres) | 10% |
| Capital payback | 8% |

### Decision rules, in order

1. Margin below the reject floor and not a strategic exception → **Reject** if readiness is
   also below the conditional band, else **Conditional**.
2. Readiness below the conditional band → **Reject** (or **Conditional** under a strategic
   exception).
3. Recommended product carries a hard disqualifier → **Conditional**.
4. Required price is a premium beyond `maxAcceptablePremiumPct` → **Pilot Candidate** (or
   **Conditional** below the candidate band). *A price the customer will not accept is not a
   deal, however good the margin looks.*
5. Readiness ≥ strong band **and** margin ≥ target → **Pursue** (**Pursue Subject to Site
   Visit** if the cluster is isolated).
6. Readiness ≥ candidate band and margin ≥ target → **Pursue Subject to Site Visit**.
7. Readiness ≥ candidate band and margin ≥ conditional → **Pilot Candidate**.
8. Otherwise → **Conditional**.

`decisionOverride` on the property beats all of it, and the UI labels the result as a manual
override.

**"Why This Site Works"** is generated from the highest-scoring readiness categories,
utilization inside the band, contribution and per-technician-hour economics, cluster drivers,
customer savings and support burden.

**"What Could Break the Model"** always leads with an intervention-rate sensitivity — it
recomputes the contribution margin at **double** the modeled physical intervention rate and
states both numbers — then adds utilization fragility, the unverified autonomous-compatible
percentage, every critical flag, isolated-cluster travel, thin customer savings, low scope
replacement, payback beyond target, and unverified equipment specs.
