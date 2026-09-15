# Phase 2

Ordered by what most reduces underwriting error per unit of build effort.

## 1. Replace manual measurement (highest impact)

Manual acreage and the evaluator's `autonomousCompatiblePct` judgment together carry 25% of
the readiness score and set the machine count, which sets the capital, which is the largest
cost line.

- **Parcel + boundary data** (Regrid / county GIS) keyed off the address to populate parcel
  acreage and lot geometry automatically.
- **Aerial imagery with turf polygon drawing** — let the evaluator trace mowable areas and
  have the tool compute acreage, contiguity, largest zone, average zone and perimeter. Those
  five fields are error-prone by hand and feed three readiness categories.
- **Slope from a digital elevation model** to replace the estimated `maxSlopePct` and steep-area
  count.
- **Obstacle detection from imagery** (trees, light poles, beds) to pre-fill the counts.

`GisPlaceholder` on every property already carries `measurementSource`, `parcelId`,
`aerialImageUrl`, `measuredTurfAcres` and `lastSyncedAt` for exactly this.

## 2. Close the intervention-data loop

The intervention rate is the model's softest input and the thing the operator will learn
fastest.

- **OEM telemetry ingestion** (Husqvarna Fleet Services, Kress, ECHO) for actual uptime, fault
  codes, stoppage locations and mowing hours. `MowerProduct.apiAvailable` flags which
  platforms can support this.
- **Field service logging** — a technician app that records each dispatch against a property,
  category and duration.
- **Back-test the model**: compare predicted vs actual intervention rate by readiness band and
  refit `baselinePhysicalPerMachineMonth`, `readinessSensitivity` and the category mix from
  real data. Track prediction error per property as an underwriting quality metric.
- **Site-type priors** — a school and an industrial park at the same readiness score almost
  certainly do not have the same intervention profile.

## 3. Real backend

- Postgres behind an API, replacing the `localStorage` repository (one file:
  `src/lib/store.tsx`).
- **Versioned assumption sets** with effective dates, so a property records *which* assumptions
  it was underwritten under. Today an assumption change silently re-prices the whole book — fine
  for a modeling tool, unacceptable for a committee record.
- Snapshot a report at decision time, immutable, alongside the live recomputed view.
- Multi-user with roles (evaluator / underwriter / approver) and an audit trail on
  `decisionOverride`.

## 4. Mapping and route modeling

- Geocoding and a real deployment map on `/clusters`.
- **Drive-time isochrones** instead of straight-line miles — 12 miles across a metro at 8am is
  not 12 miles on a highway.
- Automatic machine counts within each radius band from the live fleet database.
- **Route optimization**: model a technician's weekly route across the cluster and allocate
  travel cost from the route rather than per-property round trips. This is the single largest
  refinement available to the cost model.

## 5. Equipment catalog maturity

- A **verification workflow** — who verified `specsVerified`, against what source, when.
- Dealer quote tracking, lead times and availability by market.
- Field-observed capacity per product per site type, to replace guessed derate factors with
  measured ones.
- Battery degradation curves and real residual values as the fleet ages.

## 6. Underwriting depth

- **Monte Carlo** on the three or four inputs that actually matter (intervention rate,
  autonomous-compatible percentage, achievable price, termination probability) to produce a
  contribution-margin distribution rather than a point estimate.
- **Tornado sensitivity chart** per property, generalizing the doubled-intervention-rate
  sensitivity the report already shows.
- **Portfolio construction** — technician capacity planning, capital budgeting across the
  pipeline, and cluster-aware sequencing of which deals to sign first.
- **Cohort tracking** — underwritten vs realized margin, by site type and by vintage.

## 7. Commercial workflow

- CRM integration (property, contact, opportunity stage) and proposal generation from the
  report.
- Contract templates per mechanism, including the early-termination charge language that
  mechanism E assumes is enforceable.
- Customer-facing portal: appearance photos, mow frequency, uptime, service log.
- E-signature and a deployment checklist that turns a signed deal into a commissioning plan.

## 8. Operations

- Commissioning checklist and as-built record per site (dock location, zone map, RTK base
  position).
- Winterization and storage tracking.
- Spare pool management across the cluster, rather than the per-property spare allocation the
  model currently assumes.
- Warranty and RMA tracking against `MowerProduct.warrantyMonths`.

## Explicitly deferred

Automated aerial AI vision, predictive-maintenance ML, dynamic pricing, and any animation or
polish work. None of them reduce underwriting error at this stage. The binding constraint is
input quality, not model sophistication.
