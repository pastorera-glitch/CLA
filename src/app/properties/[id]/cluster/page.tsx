"use client";

import { FieldGrid, NumberField, TextAreaField, ToggleField } from "@/components/fields";
import { ClusterBadge } from "@/components/decision";
import { PropertyWorkspace } from "@/components/property-page";
import { Bullets, Callout, Card, PlaceholderNote, ScoreBar, ScoreDial, StatTile } from "@/components/ui";
import { number } from "@/lib/format";

export default function ClusterPage() {
  return (
    <PropertyWorkspace
      title="Geographic Density / Cluster Assessment"
      subtitle="Service density decides whether technician time is amortized across a route or burned on a single site. It carries 10% of the readiness score by default."
    >
      {({ property, result, update }) => {
        const c = property.cluster;
        const set = <K extends keyof typeof c>(key: K, value: (typeof c)[K]) =>
          update((d) => {
            d.cluster[key] = value;
          });

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Cluster score" value={Math.round(result.cluster.score)} sub="0–100" />
              <StatTile label="Weighted machines nearby" value={number(result.cluster.weightedMachineCount, 1)} sub="Radius-weighted count" />
              <StatTile label="Technician travel" value={`${c.technicianTravelMinutes} min`} sub="One way from hub" />
              <StatTile
                label="Strengthens cluster"
                value={result.cluster.strengthensExistingCluster ? "Yes" : "No"}
                sub={result.cluster.strengthensExistingCluster ? "Adds to an existing route" : "Isolated deployment"}
              />
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <Card title="Existing deployment density">
                  <FieldGrid>
                    <NumberField
                      label="Distance to nearest deployment"
                      value={c.distanceToNearestDeploymentMiles}
                      onChange={(v) => set("distanceToNearestDeploymentMiles", v)}
                      suffix="mi"
                      min={0}
                    />
                    <NumberField label="Machines within 5 mi" value={c.machinesWithin5Miles} onChange={(v) => set("machinesWithin5Miles", v)} min={0} step={1} />
                    <NumberField label="Machines within 10 mi" value={c.machinesWithin10Miles} onChange={(v) => set("machinesWithin10Miles", v)} min={0} step={1} />
                    <NumberField label="Machines within 15 mi" value={c.machinesWithin15Miles} onChange={(v) => set("machinesWithin15Miles", v)} min={0} step={1} />
                    <NumberField label="Machines within 25 mi" value={c.machinesWithin25Miles} onChange={(v) => set("machinesWithin25Miles", v)} min={0} step={1} />
                    <NumberField label="Machines within 50 mi" value={c.machinesWithin50Miles} onChange={(v) => set("machinesWithin50Miles", v)} min={0} step={1} />
                    <NumberField
                      label="Autonomous acres in local cluster"
                      value={c.autonomousAcresInCluster}
                      onChange={(v) => set("autonomousAcresInCluster", v)}
                      suffix="ac"
                      min={0}
                    />
                    <NumberField
                      label="Estimated technician travel time"
                      value={c.technicianTravelMinutes}
                      onChange={(v) => set("technicianTravelMinutes", v)}
                      suffix="min"
                      min={0}
                      help="One way. The engine bills round trips."
                    />
                  </FieldGrid>
                </Card>

                <Card title="Strategic exception" subtitle="An isolated site can still be correct if it is a deliberate beachhead. The rationale has to be written down.">
                  <FieldGrid cols={1}>
                    <ToggleField
                      label="Treat as a strategic exception"
                      value={c.strategicException}
                      onChange={(v) => set("strategicException", v)}
                      help="Overrides the cluster classification but not the cluster score."
                    />
                    <TextAreaField
                      label="Rationale"
                      value={c.strategicExceptionRationale}
                      onChange={(v) => set("strategicExceptionRationale", v)}
                      rows={3}
                    />
                  </FieldGrid>
                </Card>

                <PlaceholderNote>
                  Distances and machine counts are entered manually. Phase 2 connects a mapping/geocoding API and the
                  live fleet database so these populate automatically from the deployment map.
                </PlaceholderNote>
              </div>

              <div className="space-y-4">
                <Card title="Cluster score">
                  <div className="flex flex-col items-center gap-3">
                    <ScoreDial score={result.cluster.score} />
                    <ClusterBadge classification={result.cluster.classification} />
                  </div>
                  <div className="mt-4 space-y-2.5">
                    <ScoreBar score={result.cluster.components.proximity} label="Proximity (30%)" right={Math.round(result.cluster.components.proximity)} />
                    <ScoreBar score={result.cluster.components.machineDensity} label="Machine density (30%)" right={Math.round(result.cluster.components.machineDensity)} />
                    <ScoreBar score={result.cluster.components.travelEfficiency} label="Travel efficiency (25%)" right={Math.round(result.cluster.components.travelEfficiency)} />
                    <ScoreBar score={result.cluster.components.acreDensity} label="Acre density (15%)" right={Math.round(result.cluster.components.acreDensity)} />
                  </div>
                </Card>

                <Card title="What helps">
                  <Bullets items={result.cluster.drivers} tone="good" />
                </Card>
                <Card title="What hurts">
                  <Bullets items={result.cluster.risks} tone="bad" />
                </Card>

                <Card title="Classification bands">
                  <div className="space-y-2">
                    <Callout tone="good" title="Dense / highly additive">Drops into an existing service route.</Callout>
                    <Callout tone="accent" title="Building density">A cluster is forming but does not yet carry itself.</Callout>
                    <Callout tone="bad" title="Isolated">Every dispatch is a dedicated trip.</Callout>
                    <Callout tone="warn" title="Strategic exception">Isolated by choice, with a documented rationale.</Callout>
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
