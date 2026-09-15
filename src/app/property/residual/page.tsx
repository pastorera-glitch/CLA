"use client";

import { FieldGrid, PercentField, SelectField, TextAreaField, ToggleField } from "@/components/fields";
import { PropertyWorkspace } from "@/components/property-page";
import { Badge, Bullets, Callout, Card, KeyValue, StatTile, Table, Td, Th } from "@/components/ui";
import { money, number } from "@/lib/format";
import type { LandscaperRole, ResidualOwner } from "@/lib/types";
import {
  LANDSCAPER_ROLE_LABELS,
  RESIDUAL_OWNER_LABELS,
  RESIDUAL_SERVICE_LABELS,
} from "@/lib/types";

const OWNERS = Object.keys(RESIDUAL_OWNER_LABELS) as ResidualOwner[];
const ROLES = Object.keys(LANDSCAPER_ROLE_LABELS) as LandscaperRole[];

export default function ResidualPage() {
  return (
    <PropertyWorkspace
      title="Residual Landscaping Assessment"
      subtitle="We sell autonomous mowing, not full-service landscaping. Residual scope is shown as part of the site operating architecture — it is never booked as our revenue or our cost."
    >
      {({ property, result, update }) => {
        const r = property.residual;
        const res = result.residual;

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Mowing scope replaced" value={`${number(res.replacedPct, 0)}%`} sub={money(res.replacedIncumbentMowingSpend)} />
              <StatTile label="Mowing scope retained" value={money(res.retainedIncumbentMowingSpend)} sub="Stays with a human crew" />
              <StatTile label="Perimeter needing finishing" value={`${number(res.perimeterLinearFeetRequiringFinish, 0)} lf`} sub={`${number(res.estimatedResidualTrimHoursPerYear, 0)} labor hr/season`} />
              <StatTile label="Residual landscaping spend" value={money(res.residualLandscapingAnnualSpend)} sub="Excluded from our P&L" />
            </div>

            <Callout tone="accent" title="Why this is kept separate">
              Counting residual landscaping as our revenue would flatter every deal on this platform. It is the
              customer&apos;s spend with someone else. What matters to underwriting is how much of the mowing scope we
              actually displace and who is left standing on the property.
            </Callout>

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <Card title="Residual service lines" subtitle="What remains outside the robotic mowing scope, and who performs it." dense>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Service</Th>
                        <Th align="center">In incumbent scope</Th>
                        <Th>Performed by</Th>
                        <Th align="right">Est. annual cost</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.lines.map((line, idx) => (
                        <tr key={line.service}>
                          <Td>{RESIDUAL_SERVICE_LABELS[line.service]}</Td>
                          <Td align="center">
                            <input
                              type="checkbox"
                              checked={line.inIncumbentScope}
                              aria-label={`${RESIDUAL_SERVICE_LABELS[line.service]} in incumbent scope`}
                              onChange={(e) =>
                                update((d) => {
                                  d.residual.lines[idx].inIncumbentScope = e.target.checked;
                                })
                              }
                            />
                          </Td>
                          <Td>
                            <select
                              className="w-full rounded border border-ink-200 px-1.5 py-1 text-[12px]"
                              value={line.owner}
                              aria-label={`${RESIDUAL_SERVICE_LABELS[line.service]} performed by`}
                              onChange={(e) =>
                                update((d) => {
                                  d.residual.lines[idx].owner = e.target.value as ResidualOwner;
                                })
                              }
                            >
                              {OWNERS.map((o) => (
                                <option key={o} value={o}>
                                  {RESIDUAL_OWNER_LABELS[o]}
                                </option>
                              ))}
                            </select>
                          </Td>
                          <Td align="right">
                            <input
                              type="number"
                              className="tnum w-24 rounded border border-ink-200 px-1.5 py-1 text-right text-[12px]"
                              value={line.estimatedAnnualCost}
                              aria-label={`${RESIDUAL_SERVICE_LABELS[line.service]} estimated annual cost`}
                              onChange={(e) =>
                                update((d) => {
                                  d.residual.lines[idx].estimatedAnnualCost = Number(e.target.value) || 0;
                                })
                              }
                            />
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card>

                <Card title="Scope replacement and landscaper relationship">
                  <FieldGrid cols={2}>
                    <PercentField
                      label="Incumbent mowing scope replaced by robotics"
                      value={r.incumbentMowingScopeReplacedPct}
                      onChange={(v) => update((d) => { d.residual.incumbentMowingScopeReplacedPct = v; })}
                      help="Drives how much of the incumbent mowing spend is actually available to us."
                    />
                    <PercentField
                      label="Turf perimeter still requiring manual finishing"
                      value={property.assessment.perimeterManualFinishPct}
                      onChange={(v) => update((d) => { d.assessment.perimeterManualFinishPct = v; })}
                      help="Shared with the site assessment."
                    />
                    <ToggleField
                      label="Existing landscaper remains onsite"
                      value={r.landscaperRemainsOnsite}
                      onChange={(v) => update((d) => { d.residual.landscaperRemainsOnsite = v; })}
                    />
                    <ToggleField
                      label="Landscaper could provide defined robot-support tasks"
                      value={r.landscaperCanSupportRobots}
                      onChange={(v) => update((d) => { d.residual.landscaperCanSupportRobots = v; })}
                      help="Debris sweeps, dock clearing and first-look checks materially cut our dispatch travel."
                    />
                    <SelectField<LandscaperRole>
                      label="Potential landscaper service role"
                      value={r.landscaperRole}
                      onChange={(v) => update((d) => { d.residual.landscaperRole = v; })}
                      options={ROLES.map((x) => ({ value: x, label: LANDSCAPER_ROLE_LABELS[x] }))}
                    />
                  </FieldGrid>
                  <div className="mt-3">
                    <FieldGrid cols={1}>
                      <TextAreaField label="Notes" value={r.notes} onChange={(v) => update((d) => { d.residual.notes = v; })} rows={3} />
                    </FieldGrid>
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                <Card title="Site operating architecture">
                  <Bullets items={res.siteOperatingArchitecture} />
                </Card>
                <Card title="Warnings">
                  <Bullets items={res.warnings} tone="warn" />
                </Card>
                <Card title="Scope summary">
                  <KeyValue
                    rows={[
                      { label: "Incumbent mowing-only spend", value: money(property.intake.estimatedMowingOnlyCost) },
                      { label: "Replaced by robotics", value: money(res.replacedIncumbentMowingSpend) },
                      { label: "Retained by a crew", value: money(res.retainedIncumbentMowingSpend) },
                      { label: "In-scope residual lines", value: res.linesInScope.length },
                      { label: "Out-of-scope lines", value: res.linesOutOfScope.length },
                      { label: "Residual spend (informational)", value: money(res.residualLandscapingAnnualSpend) },
                    ]}
                  />
                  <div className="mt-3">
                    <Badge tone="neutral">Not included in operator revenue or cost</Badge>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        );
      }}
    </PropertyWorkspace>
  );
}
