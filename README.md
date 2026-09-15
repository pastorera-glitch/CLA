# TurfOps — Commercial Robotic Mowing Underwriting Platform (MVP)

A site evaluation and underwriting tool for a **robotics-as-a-service operator** that leaves
autonomous mowers resident on commercial property: industrial parks, office campuses,
multifamily, dealerships, schools, churches, cemeteries and retail centers.

This is not a lawn-mower shopping tool. Its job is to **reject weak properties quickly** and
identify the subset of commercial sites where resident autonomous mowing generates compelling
economics — before anyone drives to the site.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start
npm test           # calculation-engine test suite (21 tests)
npm run typecheck
```

The app seeds itself on first run with three **fictional** example properties: a dense
industrial candidate, a marginal fragmented retail site, and a larger campus requiring
multiple machines. Data persists in the browser's `localStorage`. **Assumptions → Reset all
data** restores the seed.

## The workflow

| Step | Screen | What it produces |
| --- | --- | --- |
| 1 | Property Intake | Ownership, incumbent mowing spend, contract termination terms |
| 2 | Site Assessment | Geometry, obstacle counts, 13 qualitative ratings |
| 3 | Cluster | Service-density score (feeds readiness) |
| 4 | Robot Readiness Score | 0–100 weighted score, banded, with flags |
| 5 | Equipment | Derated capacity → product match, machine count, spares |
| 6 | Intervention | Readiness-driven human-in-the-loop burden |
| 7 | Residual Scope | What stays with a crew (never our revenue or cost) |
| 8 | Customer Value | Four pricing approaches vs. a cost floor |
| 9 | Contract | Six capital-risk recovery mechanisms × six structures |
| 10 | Economics | Property P&L, contribution margin, payback |
| 11 | Report | Fourteen-section printable underwriting file |

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — application architecture
- [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) — data model
- [`docs/CALCULATION-METHODOLOGY.md`](docs/CALCULATION-METHODOLOGY.md) — every formula
- [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) — what is a placeholder and what it would take to verify
- [`docs/PHASE-2.md`](docs/PHASE-2.md) — what to build next
- [`docs/OPEN-DECISIONS.md`](docs/OPEN-DECISIONS.md) — business logic that needs a decision before production

## The one thing to read before trusting a number

Every equipment specification and every operating cost in this build is an **unverified
placeholder**. The engine is sound; the inputs are not yet. The seeded numbers currently
produce an honest and uncomfortable result: at placeholder commercial-robot capital costs,
robotic mowing prices at **near parity to a modest premium** against crew mowing on most
sites, and only clears the 35% contribution target at scale with dense clusters. That is a
finding to argue with, not a bug to fix in the code.
