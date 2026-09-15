# Placeholder Assumptions

Everything in this document is a **placeholder**. The calculation engine is finished; its
inputs are not. Each item below states the current value, why it was chosen, and what would
replace it.

---

## A. Equipment catalog — the largest single risk

**Every field on every one of the twelve seeded products is unverified.** `specsVerified` is
`false` on all of them and the UI says so wherever a product appears.

Seeded rows: Husqvarna Automower 535 AWD · Husqvarna CEORA 546 EPOS · Husqvarna CEORA 544 EPOS
· Kress RTKn Mission KR236E · Kress RTKn Commercial XL *(invented SKU)* · Segway Navimow X3 ·
Segway Terranox · ECHO Robotics TM-2000 · Mammotion LUBA 2 AWD · Mammotion YUKA · Eufy future
commercial platform *(does not exist in verified commercial form)* · Custom row.

What needs verifying, in order of impact on the model:

1. **`recommendedAcres` and `maxAcres`.** These drive machine count, which drives capital,
   which is the largest cost line. A 20% capacity error changes the fleet size. Published
   "maximum working area" figures are marketing maxima under ideal conditions; the seeded
   `recommendedAcres` sits at roughly 65–80% of the stated maximum as a guess at sustained
   commercial throughput. **This ratio needs field data, not a datasheet.**
2. **`acquisitionCost`** — real fleet/dealer pricing, not MSRP.
3. **`commercialUseLimitations` and warranty.** Several seeded products are prosumer-class.
   Whether their warranty survives a commercial duty cycle is a contractual question with real
   money attached, and the answer may disqualify them outright.
4. **`usefulLifeYears` and `residualValuePct`.** Nobody has a five-year-old commercial robotic
   mower fleet to depreciate. These are guesses.
5. **`maxSlopePct`, `multiZoneSupport`, `edgeCuttingCapability`, `serviceNetwork`.**
6. **`financedAnnualCost`** — currently a round fraction of acquisition cost, not a quote.

---

## B. Intervention model

| Assumption | Value | Basis |
| --- | --- | --- |
| Baseline physical interventions | 1.0 / machine / month at readiness 75 | **Invented.** The single most important unknown in the business. |
| Baseline remote interventions | 2.2 / machine / month | Invented. |
| Readiness sensitivity | 0.45 per 25 points | Invented, chosen to produce a ×0.55–×1.45 spread across the realistic readiness range. |
| Multiplier clamp | ×0.45 – ×2.60 | Invented guard rails. |
| Average physical intervention | 0.75 hr | Plausible; unmeasured. |
| Average remote intervention | 0.25 hr | Plausible; unmeasured. |
| Average scheduled visit | 1.25 hr | Plausible; unmeasured. |
| Trip batching factor | 0.55 trips per intervention | Assumes a routed technician handles several issues per dispatch. **Unvalidated and material.** |
| Blade/service interval | 400 operating hours | Manufacturer-dependent. |
| Commissioning multiplier / window | ×2.5 for 3 months | Invented. |
| Expected uptime | 86–94% by site | Invented. |
| Category mix | 9 categories, seeded shares | Invented; it affects reporting only, not cost. |

The **intervention rate is the softest number in the entire model**, which is why every
property report leads its risk section with a doubled-rate sensitivity. Replace the baseline
with observed field data from the first ten deployments before pricing anything real.

---

## C. Labor and travel

| Assumption | Value |
| --- | --- |
| Field technician | $28/hr pre-burden |
| Remote technician | $32/hr pre-burden |
| Labor burden multiplier | ×1.35 |
| Travel (tech + vehicle) | $46/hr |

Market- and role-dependent; the burden multiplier in particular should come from actual
payroll, not a rule of thumb.

---

## D. Capital

| Assumption | Value | Note |
| --- | --- | --- |
| Cost of capital | 10% | Should be the operator's real blended cost. |
| Finance term / APR | 4 yr / 11% | No quote behind it. |
| Default useful life | 5 yr | See A.4. |
| Redeployment cost | $1,800 / machine | **Invented.** Drives the entire termination-risk premium. |
| Redeployment idle period | 4 months | Invented. |

---

## E. Fleet operating cost

| Assumption | Value | Note |
| --- | --- | --- |
| Monitoring / connectivity | $300 / machine / yr | Should be an OEM subscription + SIM quote. |
| Insurance | 1.5% of capital / yr | Should be an inland-marine quote. |
| Repairs | 5% of capital / yr | **No service history exists to support this.** |
| Battery / replacement reserve | 2.5% of capital / yr | Depends on unknown pack life and pack price. |
| Consumables | $260 / machine / yr + blade sets at $45 | Rough. |
| Storage / winterization | $180 / machine / yr | Rough. |
| Spare ratio | 0.12, floor of 1 spare at 3+ machines | Policy choice, not a measurement. |
| Variable administration | 4% of revenue | Placeholder allocation. |

Insurance + repairs + battery reserve together equal **9% of fleet capital every year**, on
top of economic depreciation. That stack is one of the two or three numbers most likely to
decide whether this business model works.

---

## F. Deployment / commissioning

| Assumption | Value |
| --- | --- |
| Site survey | 5 hr |
| Commissioning | 6 hr per **live** machine |
| Additional zone | 1.5 hr each |
| Crossing mapping | 2 hr each |
| Install materials | $300 / live machine |
| Charging station | $900 each |
| RTK base station | $2,600 (when the platform requires RTK) |
| Mobilization | $900 |

All invented. Commissioning hours are the number to measure first on a real install, because
they set the capital at risk under a short contract.

---

## G. Season

30-week mowing season, 6 operating days per week, 12 operating hours per day, season starting
in month 4. **Climate-dependent** — a Texas industrial park and a Minnesota campus do not share
a season, and the model currently applies one global season to the whole book. See
[`OPEN-DECISIONS.md`](OPEN-DECISIONS.md#5-one-global-season-for-a-multi-market-book).

---

## H. Pricing and termination risk

| Assumption | Value |
| --- | --- |
| Value pricing savings target | 7.5% |
| Volume / switcher savings target | 17.5% |
| Premium pilot | −5% (a premium) |
| Short-term rate uplift | 18% |
| Multi-season discount | 4% per season, capped at 10% |
| Early-termination charge collectibility | 70% |
| Termination probability | half-season 45% · full season 25% · two-season 15% · three-season 10% · 30-day cancellable 40% · custom 20% |

The termination probabilities are **guesses with no loss history behind them**, and they drive
the flexibility premium directly. The 70% collectibility figure on an early-termination charge
is a legal question dressed as a modeling input.

---

## I. Underwriting thresholds

35% target contribution · 25% conditional floor · 25% reject floor · 2.5 yr target payback ·
55–92% machine utilization band · 10% maximum acceptable premium over replaced incumbent
spend. All editable; all policy choices rather than facts.

---

## J. Site measurement

Every acreage, obstacle count, perimeter length and slope figure is **entered by hand**. There
is no GIS, aerial imagery or parcel integration in this build. The
`autonomousCompatiblePct` field carries 25% of the readiness score and is a pure judgment
call by the evaluator.

---

## K. The seeded example properties

Northgate Logistics Center, Riverbend Crossing Retail Center and Cedar Ridge Corporate Campus
are **fictional**. Owners, managers, landscapers, addresses and contract values are invented
to exercise the engine across a strong candidate, a poor candidate and a multi-machine campus.

---

## What the placeholders currently imply

Run as seeded, the model says that at today's commercial robotic-mower capital costs
(roughly **$5,000–$8,000 of capital per serviced acre**), robotic mowing prices at **near
parity to a modest premium** against crew mowing, and reaches the 35% contribution target
mainly through scale, dense clusters and long commitments. That is a substantive claim about
the business, produced by the arithmetic rather than asserted. It should be argued with using
real equipment quotes and real intervention data — not patched in the code.
