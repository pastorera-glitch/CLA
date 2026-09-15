"use client";

import { FieldGrid, NumberField, SelectField, TextAreaField } from "@/components/fields";
import { PropertyWorkspace } from "@/components/property-page";
import {
  Badge,
  Bullets,
  Callout,
  Card,
  KeyValue,
  PlaceholderNote,
  ScoreBar,
  StatTile,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { acres, money, number, pct, titleCase } from "@/lib/format";
import { useStore } from "@/lib/store";
import { MOWER_CLASS_LABELS, NAVIGATION_TECH_LABELS } from "@/lib/types";

export default function EquipmentMatchPage() {
  const { products } = useStore();

  return (
    <PropertyWorkspace
      title="Product / Equipment Matching"
      subtitle="Capacity is derated by site conditions before machine count is computed. The engine does not pick the machine with the largest acreage rating."
    >
      {({ property, result, update }) => {
        const e = result.equipment;
        const rec = e.recommended;

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatTile label="Autonomous acres" value={number(e.autonomousAcres, 2)} sub={`${pct(property.assessment.geometry.autonomousCompatiblePct, 0)} of turf`} />
              <StatTile label="Live machines" value={e.liveMachines} sub={rec ? `${acres(rec.effectiveAcresPerMachine)} each, derated` : ""} />
              <StatTile label="Spare allocation" value={e.spareMachines} sub={`${e.totalMachines} total fleet`} />
              <StatTile label="Utilization" value={pct(e.utilizationPct, 0)} sub="Of derated capacity" />
              <StatTile label="Fleet capital" value={money(result.capital.fleetAcquisitionCost)} sub="At placeholder acquisition cost" />
            </div>

            {rec && !rec.product.specsVerified && (
              <Callout tone="warn" title="Unverified specifications">
                Every field behind this recommendation — acreage capacity, slope rating, price, warranty and commercial-use
                terms — is a placeholder. Verify against the OEM datasheet and a dealer quote before quoting a customer.
              </Callout>
            )}

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
                {rec && (
                  <Card
                    title={`Recommended: ${rec.product.manufacturer} ${rec.product.model}`}
                    subtitle={`Fit score ${Math.round(rec.fitScore)}/100 · ${MOWER_CLASS_LABELS[rec.product.mowerClass]} · ${titleCase(rec.product.segment)} class`}
                    actions={<Badge tone={rec.disqualifiers.length ? "bad" : "good"}>{rec.disqualifiers.length ? "Disqualified" : "Best fit"}</Badge>}
                  >
                    <div className="mb-4">
                      <h3 className="label-caps mb-1.5">Rationale</h3>
                      <Bullets items={e.rationale} tone="neutral" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <h3 className="label-caps mb-1.5">Capacity derate</h3>
                        <ul className="space-y-1 text-[12px] text-ink-600">
                          <li className="flex justify-between border-b border-ink-100 py-1">
                            <span>Catalog rating</span>
                            <span className="tnum font-medium text-ink-900">{acres(rec.product.recommendedAcres)}</span>
                          </li>
                          {rec.derateDetail.map((d, i) => (
                            <li key={i} className="flex justify-between border-b border-ink-100 py-1">
                              <span>{d.split(":")[0]}</span>
                              <span className="tnum font-medium text-ink-900">{d.split(":")[1]}</span>
                            </li>
                          ))}
                          <li className="flex justify-between py-1 font-semibold text-ink-900">
                            <span>Effective at this site</span>
                            <span className="tnum">{acres(rec.effectiveAcresPerMachine)}</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h3 className="label-caps mb-1.5">Fit sub-scores</h3>
                        <div className="space-y-2">
                          {Object.entries(rec.subScores).map(([k, v]) => (
                            <ScoreBar key={k} score={v} label={titleCase(k.replace(/([A-Z])/g, " $1"))} right={Math.round(v)} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <h3 className="label-caps mb-1.5">Why it may not suit this site</h3>
                        <Bullets items={[...rec.disqualifiers, ...rec.cautions]} tone={rec.disqualifiers.length ? "bad" : "warn"} />
                      </div>
                      <div>
                        <h3 className="label-caps mb-1.5">Specifications (placeholder)</h3>
                        <KeyValue
                          rows={[
                            { label: "Navigation", value: NAVIGATION_TECH_LABELS[rec.product.navigationTech] },
                            { label: "RTK required", value: rec.product.requiresRtk ? "Yes" : "No" },
                            { label: "Cellular required", value: rec.product.requiresCellular ? "Yes" : "No" },
                            { label: "Obstacle detection", value: titleCase(rec.product.obstacleDetection) },
                            { label: "Cutting width", value: `${rec.product.cuttingWidthInches}"` },
                            { label: "Runtime / charge", value: `${rec.product.runtimeMinutes} / ${rec.product.chargeMinutes} min` },
                            { label: "Max slope", value: `${rec.product.maxSlopePct}%` },
                            { label: "Edge cutting", value: `${rec.product.edgeCuttingCapability}/5` },
                            { label: "Active trimming", value: rec.product.activeTrimming ? "Yes" : "No" },
                            { label: "Fleet management", value: rec.product.fleetManagement ? "Yes" : "No" },
                            { label: "API", value: rec.product.apiAvailable ? "Available" : "None" },
                            { label: "Warranty", value: `${rec.product.warrantyMonths} mo` },
                            { label: "Useful life", value: `${rec.product.usefulLifeYears} yr` },
                            { label: "Residual value", value: `${rec.product.residualValuePct}%` },
                            { label: "Service network", value: `${rec.product.serviceNetwork}/5` },
                            { label: "MSRP / acquisition", value: `${money(rec.product.msrp)} / ${money(rec.product.acquisitionCost)}` },
                          ]}
                        />
                        <p className="mt-2 text-[11.5px] leading-snug text-ink-500">
                          Commercial-use limitations: {rec.product.commercialUseLimitations}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                <Card title="All candidates" subtitle="Ranked by site fit. Products with a hard disqualifier sort below every clean product." dense>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Product</Th>
                        <Th align="right">Catalog ac</Th>
                        <Th align="right">Derated ac</Th>
                        <Th align="right">Units</Th>
                        <Th align="right">Util.</Th>
                        <Th align="right">$/auto ac</Th>
                        <Th align="right">Fit</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.ranked.map((r) => (
                        <tr key={r.product.id} className={r.product.id === rec?.product.id ? "bg-accent-50" : ""}>
                          <Td className="min-w-[230px]">
                            <div className="font-medium text-ink-900">
                              {r.product.manufacturer} {r.product.model}
                            </div>
                            <div className="text-[11px] text-ink-400">{MOWER_CLASS_LABELS[r.product.mowerClass]}</div>
                          </Td>
                          <Td align="right" numeric>{number(r.product.recommendedAcres, 1)}</Td>
                          <Td align="right" numeric>{number(r.effectiveAcresPerMachine, 2)}</Td>
                          <Td align="right" numeric>{r.liveMachines}</Td>
                          <Td align="right" numeric>{pct(r.utilizationPct, 0)}</Td>
                          <Td align="right" numeric>{money(r.annualCostPerAutonomousAcre)}</Td>
                          <Td align="right" numeric>{Math.round(r.fitScore)}</Td>
                          <Td>
                            {r.disqualifiers.length > 0 ? (
                              <Badge tone="bad">Disqualified</Badge>
                            ) : r.cautions.length > 2 ? (
                              <Badge tone="warn">{r.cautions.length} cautions</Badge>
                            ) : (
                              <Badge tone="good">Eligible</Badge>
                            )}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card>
              </div>

              <div className="space-y-4">
                <Card title="Operator overrides" subtitle="Force a product or machine count when the engine's pick is wrong.">
                  <FieldGrid cols={1}>
                    <SelectField
                      label="Product override"
                      value={property.equipment.selectedProductIdOverride}
                      onChange={(v) => update((d) => { d.equipment.selectedProductIdOverride = v; })}
                      options={[
                        { value: "", label: "Use engine recommendation" },
                        ...products.map((p) => ({ value: p.id, label: `${p.manufacturer} ${p.model}` })),
                      ]}
                    />
                    <NumberField
                      label="Machine count override"
                      value={property.equipment.machineCountOverride}
                      onChange={(v) => update((d) => { d.equipment.machineCountOverride = v; })}
                      min={0}
                      step={1}
                      help="0 uses the computed count."
                    />
                    <TextAreaField
                      label="Notes"
                      value={property.equipment.notes}
                      onChange={(v) => update((d) => { d.equipment.notes = v; })}
                      rows={3}
                    />
                  </FieldGrid>
                  {e.overridden && (
                    <div className="mt-3">
                      <Callout tone="warn" title="Override active">
                        The machine count and capital figures reflect your override, not the engine's computation.
                      </Callout>
                    </div>
                  )}
                </Card>

                {e.alternative && (
                  <Card title="Alternative product" subtitle={`Fit ${Math.round(e.alternative.fitScore)}/100`}>
                    <p className="text-[13px] font-semibold text-ink-900">
                      {e.alternative.product.manufacturer} {e.alternative.product.model}
                    </p>
                    <KeyValue
                      rows={[
                        { label: "Machines", value: `${e.alternative.liveMachines} live` },
                        { label: "Derated capacity", value: acres(e.alternative.effectiveAcresPerMachine) },
                        { label: "Utilization", value: pct(e.alternative.utilizationPct, 0) },
                        { label: "$/autonomous acre", value: money(e.alternative.annualCostPerAutonomousAcre) },
                        { label: "Fleet capital", value: money(e.alternative.product.acquisitionCost * (e.alternative.liveMachines + e.alternative.spareMachines)) },
                      ]}
                    />
                    <div className="mt-3">
                      <h4 className="label-caps mb-1.5">Reasons it is not first choice</h4>
                      <Bullets items={[...e.alternative.disqualifiers, ...e.alternative.cautions]} tone="warn" />
                    </div>
                  </Card>
                )}

                <Card title="Spare policy">
                  <KeyValue
                    rows={[
                      { label: "Live machines", value: e.liveMachines },
                      { label: "Spares", value: e.spareMachines },
                      { label: "Total fleet", value: e.totalMachines },
                      { label: "Machine operating window", value: `${number(e.machineOperatingHoursPerYear, 0)} hr/season` },
                    ]}
                  />
                  <p className="mt-2 text-[11.5px] leading-snug text-ink-500">
                    Spares are held at the configured ratio with a floor once the site reaches the threshold machine
                    count. They carry insurance, battery reserve and storage but are not commissioned on site.
                  </p>
                </Card>

                <PlaceholderNote>
                  The equipment catalog is seeded with placeholder specifications. Edit it under Equipment in the main
                  navigation. OEM telemetry and live dealer pricing are Phase 2.
                </PlaceholderNote>
              </div>
            </div>
          </div>
        );
      }}
    </PropertyWorkspace>
  );
}
