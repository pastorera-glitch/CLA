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
npm test           # calculation-engine test suite (21 tests)
npm run typecheck
```

## Sharing it as a link

The app is a **fully static site**. The calculation engine runs in the browser and
evaluations persist to `localStorage`, so there is no server, no database and nothing to
operate — `npm run build` emits a self-contained `out/` directory that any static host will
serve.

```bash
npm run build      # writes ./out
npm start          # preview the built site at http://localhost:3000
```

### GitHub Pages (already wired)

`.github/workflows/deploy-pages.yml` typechecks, tests and builds on every push to `main` or
the feature branch, then publishes to Pages.

**One-time setup, and it has to be done by hand:** repository *Settings → Pages → Source →
GitHub Actions*. A workflow cannot create the Pages site itself — the run token is refused
with `Resource not accessible by integration`. Once Pages is on, re-run the workflow and the
site lands at `https://<owner>.github.io/<repo>/` — here,
`https://pastorera-glitch.github.io/CLA/`.

Until then the `publish` job fails, but **`build` still succeeds and uploads a `static-site`
artifact** on the run page. Download that zip and you have a deployable folder without
installing anything locally — see the table below.

The workflow builds twice on purpose: once with `BASE_PATH=/<repo>` for Pages, and once
without it for the downloadable artifact. Asset paths differ by where a site is mounted, and a
build made for a subdirectory renders blank at a domain root.

The workflow passes `BASE_PATH=/<repo>` automatically, because project Pages sites are served
from a subdirectory.

### Anywhere else

| Host | How |
| --- | --- |
| Netlify | Drag `out/` (or the unzipped `static-site` artifact) onto [Netlify Drop](https://app.netlify.com/drop) — instant URL, no account required to start. Or connect the repo with build `npm run build` and publish directory `out` |
| Cloudflare Pages | Build `npm run build`, output directory `out` |
| Vercel | `vercel --prod` (auto-detected; no configuration needed) |
| S3 / CloudFront | `aws s3 sync out/ s3://<bucket>/` |
| Any web server | Copy `out/` into the document root |

Serving from a subdirectory needs `BASE_PATH=/sub npm run build`. Root deployments need
nothing. `trailingSlash` is on, so every route emits an `index.html` and no custom rewrite
rules are required.

### What to know before you circulate the link

- **Every visitor gets their own private copy**, seeded with the three example properties.
  Data lives in that person's browser via `localStorage` — nothing is sent anywhere, nothing
  is shared between people, and clearing site data resets them to the seed.
- **There is no authentication.** Anyone with the link sees everything, including the
  Assumptions screen. Fine for demoing and arguing with the model; not fine for real deal
  files. Shared, durable, access-controlled storage is the Phase 2 backend item.
- Property URLs carry the id as a query parameter (`/property/economics/?id=…`), so a
  colleague can deep-link a specific tab — but only for a property that exists in *their*
  browser, which in practice means one of the three seeded examples.

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
