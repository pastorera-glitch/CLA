# Application Architecture

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | File-based routing, easy path to server rendering and API routes in Phase 2 |
| Language | TypeScript, `strict` | The domain is numeric and the types are the spec |
| UI | Tailwind CSS v4 | Design tokens in one stylesheet; no component-library lock-in |
| Persistence | `localStorage` behind a repository | MVP-appropriate; swappable without touching components |
| Tests | `node:test` via `tsx` | Engine is pure TS, so it tests without a browser |

## The hard rule: no business logic in components

```
src/lib/engine/          ← pure TypeScript. No React, no DOM, no storage.
src/lib/types.ts         ← the domain model
src/lib/assumptions.ts   ← every constant the engine reads
src/lib/store.tsx        ← persistence + React binding (the ONLY React in the data path)
src/components/          ← presentational only
src/app/                 ← routing and page composition
```

`runUnderwriting(property, products, assumptions)` is a **pure function**. Given the same
three inputs it returns the same result, with no side effects. That means:

- it is unit-testable without a browser (see `tests/engine.test.ts`),
- it can move server-side, into a queue, or into a batch re-underwriting job unchanged,
- assumptions can be swept (sensitivity analysis) by calling it in a loop,
- no component can quietly introduce a business rule, because components receive a computed
  result object and render it.

Every calculation module exports its intermediate values and a plain-language `detail` or
`basis` string next to each number. The UI renders those strings rather than restating the
formula, so the explanation can never drift from the arithmetic.

## Module graph

```
                    ┌──────────────┐
                    │ assumptions  │  (editable, single source of constants)
                    └──────┬───────┘
                           │  read by every module below
  property ──▶ cluster ──▶ readiness ──▶ equipment ──▶ intervention
                                              │             │
                                              ▼             ▼
                                           capital ──▶   opex
                                              │             │
                                              └──────┬──────┘
                                                     ▼
                                                  contract   (solves the cost floor)
                                                     │
                            residual ────────────────┼──▶ value   (prices against the floor)
                                                     │       │
                                                     └───────┴──▶ economics ──▶ recommendation
```

Evaluation order is fixed in `src/lib/engine/index.ts` and matters:

1. **cluster** first, because the cluster score is one of the nine readiness categories.
2. **readiness** next, because it drives both equipment derates and the intervention rate.
3. **equipment** before **intervention**, because intervention burden scales with machine count.
4. **capital** and **opex** before **contract**, because contract pricing solves for the price
   that hits the target contribution margin given those costs.
5. **contract** before **value**, because the contract module produces the cost floor that the
   value module tests each pricing approach against.
6. **economics** last, because it books the actual chosen price.

### Module responsibilities

| Module | Responsibility |
| --- | --- |
| `util.ts` | Clamping, safe division, weighted averages, capital recovery factor, present value |
| `cluster.ts` | Service-density score and classification |
| `readiness.ts` | Nine weighted categories, band, flags, top detractors |
| `equipment.ts` | Site derates, fit scoring, machine count, spares, disqualifiers |
| `intervention.ts` | Readiness → intervention rate; commissioning vs stabilized burden |
| `capital.ts` | Fleet acquisition, deployment cost build-up, annual economic cost |
| `opex.ts` | Recurring direct operating cost lines |
| `contract.ts` | Six structures × six mechanisms; required price; termination exposure |
| `residual.ts` | What stays outside robotic scope (informational, never in the P&L) |
| `value.ts` | Four pricing approaches, savings, cost floor test |
| `economics.ts` | Property P&L, unit economics, payback, verdict |
| `recommendation.ts` | Opportunity score, decision, why-it-works / what-breaks, diligence |

## Persistence

`src/lib/store.tsx` is a React context over three `localStorage` keys
(`turfops.properties.v1`, `turfops.products.v1`, `turfops.assumptions.v1`). Every read goes
through the context; every write goes through one of its actions. Swapping in a REST or
GraphQL backend means reimplementing that one file.

Stored assumption blobs are merged onto the current defaults (`mergeAssumptions`), so adding
a new assumption never breaks a record saved by an older build.

## Routing

```
/                              Portfolio dashboard
/properties                    Filterable pipeline table
/properties/new                Intake (draft held locally until saved)
/properties/[id]               Underwriting summary
/properties/[id]/intake
/properties/[id]/assessment
/properties/[id]/cluster
/properties/[id]/equipment
/properties/[id]/intervention
/properties/[id]/residual
/properties/[id]/value
/properties/[id]/contract
/properties/[id]/economics
/properties/[id]/report        Printable 14-section evaluation
/assessment  /equipment  /economics  /clusters     Portfolio-level views
/assumptions                   Admin: every constant in the engine
/reports                       Report index
```

## Extension points already in place

- `GisPlaceholder` on every property carries `measurementSource`, `parcelId`,
  `aerialImageUrl`, `measuredTurfAcres` and `lastSyncedAt` — the shape a GIS sync would fill.
- `MowerProduct` carries `apiAvailable`, `remoteDiagnostics`, `fleetManagement` and
  `specsVerified` — the hooks for OEM telemetry and a verification workflow.
- `ClusterInputs` is the manual stand-in for a geocoding/isochrone service.
- `decisionOverride` and `diligenceNotes` on the property give a reviewer somewhere to put a
  human judgment without corrupting the computed result.
