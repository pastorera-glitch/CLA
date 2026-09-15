# Data Model

All types live in [`src/lib/types.ts`](../src/lib/types.ts). Conventions that hold everywhere:

- Money is **USD, nominal, annual** unless the field name says otherwise.
- Area is **acres**.
- Qualitative ratings are **1–5 where 5 is always the most favorable condition for autonomous
  mowing**. Direction-correct endpoint labels live in `RATING_SCALES` (`src/lib/defaults.ts`)
  and are rendered on every control, so "slope difficulty 5" unambiguously means "essentially
  flat".
- Percentages that a user types are `0–100` numbers, never `0–1` fractions. Internal fractions
  carry a `Frac` suffix.

## Three root entities

```
Property[]      ← the book of evaluations        (localStorage: turfops.properties.v1)
MowerProduct[]  ← the equipment catalog          (localStorage: turfops.products.v1)
Assumptions     ← one global, editable constant set (localStorage: turfops.assumptions.v1)
```

Nothing else is persisted. Every score, price and P&L line is derived at read time by
`runUnderwriting(property, products, assumptions)` — there are **no stored computed values**,
so changing an assumption re-underwrites the entire book instantly and no record can ever
hold a stale score.

## `Property`

```ts
interface Property {
  id, createdAt, updatedAt
  decisionOverride: DecisionStatus | null   // human override of the engine's decision
  intake:        PropertyIntake             // §1
  assessment:    SiteAssessment             // §2
  cluster:       ClusterInputs              // §6
  equipment:     EquipmentInputs            // operator overrides for §5
  intervention:  InterventionInputs         // §4
  residual:      ResidualScope              // §7
  customerValue: CustomerValueInputs        // §8
  contract:      ContractInputs             // §9
  economics:     EconomicsInputs            // §10
  diligenceNotes: string[]
}
```

### `PropertyIntake`
Name, full address, `propertyType` (14 commercial types), owner, property manager, existing
landscaper, `parcelAcres`, `estimatedTurfAcres`, `existingAnnualLandscapeCost`,
`estimatedMowingOnlyCost`, `annualMowingVisits`, `terminationProvision` (7 values including
`thirty_day_convenience`), `contractExpiration`, `notes`, and `gis: GisPlaceholder`.

`GisPlaceholder` — `{ measurementSource: 'manual' | 'aerial_estimate' | 'gis_import',
parcelId, aerialImageUrl, measuredTurfAcres, lastSyncedAt, note }`. Stored but not wired;
this is the shape a parcel/imagery integration fills.

### `SiteAssessment`
- `geometry: SiteGeometry` — `totalTurfAcres`, `contiguousTurfAcres`, `mowingZoneCount`,
  `largestZoneAcres`, `averageZoneAcres`, `autonomousCompatiblePct`,
  `turfPerimeterLinearFeet`, `maxSlopePct`, plus counts for road crossings, sidewalk
  crossings, gates, narrow passages, curbs (linear feet), retaining walls, landscape beds,
  trees, light poles, signage, drainage structures, water hazards, steep slope areas and
  irregular turf areas.
- `ratings: SiteRatings` — thirteen 1–5 ratings: turf fragmentation, slope difficulty,
  obstacle density, edge complexity, ground quality, drainage/wet areas, debris exposure,
  pedestrian interaction, vehicle interaction, vandalism/theft exposure, GPS/RTK visibility,
  cellular connectivity, charging-station suitability.
- `perimeterManualFinishPct` (0–100), `requiredFinishQuality` (1–5), `assessorNotes`.

### `InterventionInputs`
`useModelPredictedRate` (readiness-driven vs manual), scheduled visits per machine-year,
unplanned physical and remote rates per machine-month, average physical / remote / scheduled
/ travel durations, `bladeServiceIntervalHours`, `commissioningMonths`,
`commissioningMultiplier`, `expectedUptimePct`, and `categoryMix` — percent shares across the
nine intervention categories (navigation, obstruction, debris, mechanical, charging,
connectivity, vandalism, turf condition, other), normalized to 100 by the engine.

### `ClusterInputs`
Distance to nearest deployment, machine counts within 5/10/15/25/50 miles, autonomous acres
in the local cluster, technician travel minutes (one way), plus `strategicException` and its
required written rationale.

### `ResidualScope`
`lines: ResidualServiceLine[]` — one row per residual service (string trimming, edging, beds,
pruning, fertilizer, weed control, irrigation, cleanup, leaf removal, seasonal, snow, other),
each with `inIncumbentScope`, `owner` (existing landscaper / us / owner self-perform / other
vendor / not required), `estimatedAnnualCost` and a note. Plus
`incumbentMowingScopeReplacedPct`, `landscaperRemainsOnsite`, `landscaperCanSupportRobots`
and `landscaperRole`.

### `CustomerValueInputs`
Current-state figures (mowing cost override, cuts per month, crew visibility, complaints,
noise, fuel gallons, vendor-management burden), proposed-state figures (cuts per week,
expected appearance consistency), `pricingApproach` (`value` | `volume_switcher` |
`premium_pilot` | `custom`) and `customTargetSavingsPct`.

### `ContractInputs`
`structure` (half-season pilot / full season / two-season / three-season / 30-day cancellable
/ custom), `customSeasons`, `mechanism` (A–F), `upfrontDeploymentFeeCoveragePct` and a
`terminationProbabilityOverridePct` (`-1` = use the modeled value).

### `EconomicsInputs` / `EquipmentInputs`
Price override, implementation-fee override, other service revenue, finance-vs-cash toggle;
product override and machine-count override. Every override is explicit and surfaced in the UI
so a computed result is never silently replaced.

## `MowerProduct`

Manufacturer, model, `mowerClass` (7 classes), `segment` (residential / prosumer /
commercial), MSRP, acquisition cost, financed annual cost, `recommendedAcres`, `maxAcres`,
cutting width, runtime, charge time, `navigationTech`, `requiresRtk`, `requiresCellular`,
`hasVision`, `obstacleDetection`, `maxSlopePct`, `edgeCuttingCapability` (1–5),
`activeTrimming`, `fleetManagement`, `remoteDiagnostics`, `apiAvailable`, `warrantyMonths`,
`usefulLifeYears`, `residualValuePct`, `multiZoneSupport`, `commercialUseLimitations`,
`serviceNetwork` (1–5), **`specsVerified`** and `sourceNote`.

`specsVerified` is the audit flag. It is `false` on every seeded row and the UI says so
everywhere a product appears.

## `Assumptions`

Nine groups, all editable in the Assumptions screen:
`readinessWeights`, `readinessBands`, `labor`, `capital`, `fleetOpex`, `deployment`, `season`,
`interventionModel`, `pricing`, `thresholds`, `cluster`.

## Derived result types (not persisted)

`UnderwritingResult` bundles `cluster`, `readiness`, `equipment`, `intervention`, `capital`,
`stabilizedCost`, `commissioningCost`, `contract`, `residual`, `value`, `economics` and
`recommendation`. `summarize()` flattens it to a `PropertySummary` row for tables, and
`portfolioRollup()` aggregates summaries for the dashboard.

## Migration path

The model is deliberately flat, JSON-serializable and free of cross-references beyond
`equipment.selectedProductIdOverride → MowerProduct.id`. It maps directly onto relational
tables (`properties`, `products`, `assumption_sets`) or onto documents, and the nested input
groups become either JSONB columns or child tables without reshaping the engine.
