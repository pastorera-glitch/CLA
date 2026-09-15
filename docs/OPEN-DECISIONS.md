# Open Business-Logic Decisions

Places where the MVP had to choose, the choice is defensible but arguable, and a real decision
is needed before production. Each names what the code does today and what changes if you
decide otherwise.

---

## 1. Is capital recovery above or below the contribution line?

**Today:** `machineAnnualEconomicCost` — economic depreciation plus the capital charge on the
fleet — is a **direct operating cost**, so it sits above the contribution line. On the seeded
campus that is $24,753 of a $59,146 cost base: 42% of all direct cost.

**Why it matters:** a 35% contribution target with capital included is a far harder test than
35% with capital below the line. Many services businesses would treat contribution as revenue
less *cash* operating cost and handle capital separately. The threshold and the definition
have to be set together — 35% means nothing without saying which.

**Needs a decision:** either keep capital in and confirm 35% is the right bar, or move it out
and reset the thresholds. Do not mix.

---

## 2. Savings are measured against *replaced* spend, not total spend

**Today:** customer savings = `replacedIncumbentSpend − ourPrice`, where
`replacedIncumbentSpend = mowingOnlyCost × incumbentMowingScopeReplacedPct`.

On a site where we replace 45% of the mowing scope, a "17% saving" is 17% of 45% of the mowing
line — roughly 8% of mowing spend and far less of the total landscaping contract. The UI warns
about this and reports retained spend separately, but **the headline number is not what the
customer will see on their invoice**.

**Needs a decision:** which number goes in the proposal — savings on replaced scope (honest to
our model) or savings on total landscaping spend (what the customer actually experiences)?
They can differ by a factor of five.

---

## 3. Residual landscaping is excluded entirely

**Today:** residual landscaping is reported as site operating architecture and never enters
revenue or cost. A test enforces this.

**Why:** including it would flatter every deal, and it is the customer's spend with a third
party.

**But:** the seeded campus shows ~$172k of residual landscaping against $128k of mowing. If
the operator ever bundles or subcontracts residual work — and the `landscaperCanSupportRobots`
flag exists precisely because that arrangement is attractive — the model has no place to put
it. The `owner: 'operator'` option on a residual line currently only raises a warning.

**Needs a decision:** does the business stay strictly mowing-only, or is there a bundled
product? If bundled, residual needs a real revenue and cost treatment, not a warning.

---

## 4. Machine count rounds up, always

**Today:** `liveMachines = ceil(autonomousAcres / effectiveAcresPerMachine)`. 10.42 acres at
5.93 acres per machine gives 2 machines at 88% utilization; 12.0 acres gives 3 machines at
67%. One acre of measurement error can add a machine and tens of thousands of dollars of
capital.

**Not modeled:** running a machine slightly over its comfortable rating, cutting less
frequently on a marginal zone, or sharing a machine between two nearby properties in a dense
cluster — all of which a real operator would consider before buying another robot.

**Needs a decision:** is partial-capacity or cross-property machine sharing allowed, and under
what rule?

---

## 5. One global season for a multi-market book

**Today:** `mowingSeasonWeeks`, `operatingDaysPerWeek`, `operatingHoursPerDay` and
`seasonStartMonth` are **global assumptions**. The seeded book has properties in Texas, Ohio
and North Carolina sharing a 30-week season.

Season length drives machine operating hours, blade change frequency, storage cost and the
break-even date. It is wrong to share it across climates.

**Needs a decision:** move season to a per-property (or per-market) override. Straightforward
to implement; it is a modeling decision, not a technical one.

---

## 6. Termination probabilities are invented and drive real pricing

**Today:** 45% / 25% / 15% / 10% / 40% / 20% by structure, with no loss history behind them.
They multiply directly into the flexibility premium and therefore into the quoted price.

**Related:** mechanism E assumes **70% of an early-termination charge is collectible**. That is
a legal and commercial question — enforceability, customer relationship cost, willingness to
actually pursue it — expressed as a modeling constant.

**Needs a decision:** either commit to these as explicit policy (and say so in the file), or
hold mechanisms E and F back until there is a loss history. Mechanism F in particular is only
defensible at portfolio scale where the law of large numbers applies; the UI says so, but the
model will happily price a single deal on it.

---

## 7. The premium tolerance is doing real work

**Today:** `maxAcceptablePremiumPct = 10`. If the required price exceeds the replaced incumbent
spend by more than 10%, the decision is capped at **Pilot Candidate** regardless of readiness
or margin — "a price the customer will not accept is not a deal."

This rule currently determines the outcome on sites where the cost floor sits above value-based
pricing, which with the seeded assumptions is most of them.

**Needs a decision:** is 10% right, and should it vary by property type? A Class-A office campus
buying appearance and silence may pay a 20% premium; an industrial park buying mowing will not
pay 2%.

---

## 8. Readiness drives the intervention rate through one linear formula

**Today:** `rate = baseline × (1 + 0.45 × (75 − readiness) / 25)`, clamped to ×0.45–×2.60.

This is intentionally transparent and editable rather than a fitted model. But it assumes the
relationship is **linear in the aggregate score**, when in reality specific conditions probably
dominate — debris exposure and pedestrian interaction plausibly predict interventions far
better than charging-station suitability does, yet all nine categories are collapsed into one
number first.

**Needs a decision:** once field data exists, either refit this curve or move to
category-specific drivers. Do not quietly replace it with an opaque model — the transparency is
the point.

---

## 9. Contribution margin is reported at an unachievable price

**Today:** when the value-based price falls below the cost floor, the quoted price is raised to
the floor. The reported contribution margin is then, by construction, the target margin — even
on a site that should obviously be rejected. The seeded Riverbend retail site shows **35.0%
margin on a $73,471 price against $14,200 of incumbent mowing spend.**

The decision logic handles it correctly (the site is rejected, and price acceptability scores
zero), but the margin figure in isolation is misleading on a dashboard.

**Needs a decision:** either display margin only at an achievable price, or show margin
alongside an explicit "price achievable: no" indicator everywhere it appears, not just on the
property page.

---

## 10. Spare-machine policy is per property

**Today:** spares are allocated per property (12% ratio, floor of one spare at three or more
machines) and their cost is charged to that property. In a dense cluster a shared spare pool
would serve several sites at a fraction of the cost.

**Needs a decision:** per-property spares (conservative, penalizes small sites) or a
cluster-level pool with an allocation rule.

---

## 11. Financing is modeled as a spread, not as cash flow

**Today:** financing appears as `max(0, leasePayment − machineAnnualEconomicCost)` so the P&L
never double-counts capital, and financing removes fleet cost from upfront capital.

**Not modeled:** the actual cash-flow timing, the mismatch between a 4-year lease and a
5–7-year useful life, or end-of-lease obligations. For a capital-intensive leave-behind
business, the timing may matter more than the accounting.

**Needs a decision:** whether Phase 2 needs a real multi-year cash-flow model per property
rather than a steady-state annual P&L.

---

## 12. No confidence or data-quality scoring

**Today:** a property built from careful on-site measurement and one built from a five-minute
desktop estimate produce identically confident-looking scores. Only the report's standing
caveat distinguishes them.

**Needs a decision:** add a per-property data-confidence score (how many fields are measured
vs estimated, is equipment verified, has a site visit occurred) and either surface it beside
every score or let it widen the bands.
