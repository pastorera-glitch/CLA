"use client";

import Link from "next/link";

import { PageHeader } from "@/components/app-shell";
import { ClusterBadge } from "@/components/decision";
import { Button, Callout, Card, EmptyState, PlaceholderNote, ScoreBar, StatTile, Table, Td, Th } from "@/components/ui";
import { money, number } from "@/lib/format";
import { usePortfolio, useStore } from "@/lib/store";
import { CLUSTER_CLASSIFICATION_LABELS, type ClusterClassification } from "@/lib/types";
import { propertyHref } from "@/lib/routes";

export default function ClustersPage() {
  const { ready, assumptions } = useStore();
  const { results } = usePortfolio();

  if (!ready) return <div className="py-16 text-center text-[13px] text-ink-400">Loading…</div>;
  if (results.length === 0) {
    return (
      <>
        <PageHeader title="Clusters" />
        <EmptyState title="No properties to cluster">
          <Button href="/properties/new" variant="primary" className="mt-3">
            Start a new evaluation
          </Button>
        </EmptyState>
      </>
    );
  }

  const byClass = new Map<ClusterClassification, number>();
  for (const r of results) {
    byClass.set(r.cluster.classification, (byClass.get(r.cluster.classification) ?? 0) + 1);
  }

  const totalTravelHours = results.reduce((s, r) => s + r.intervention.stabilized.travelHoursTotal, 0);
  const totalTravelCost = results.reduce((s, r) => s + r.stabilizedCost.lines.travel, 0);
  const avgCluster = results.reduce((s, r) => s + r.cluster.score, 0) / results.length;

  return (
    <>
      <PageHeader
        title="Clusters"
        subtitle="Service density decides whether technician time is amortized across a route or spent driving."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Average cluster score" value={Math.round(avgCluster)} sub="Across the book" />
        <StatTile label="Dense / highly additive" value={byClass.get("dense_highly_additive") ?? 0} />
        <StatTile label="Building density" value={byClass.get("building_density") ?? 0} />
        <StatTile label="Isolated" value={byClass.get("isolated") ?? 0} />
        <StatTile label="Annual travel burden" value={`${number(totalTravelHours, 0)} hr`} sub={money(totalTravelCost)} />
      </div>

      <div className="mb-4">
        <Callout tone="accent" title="Why this carries 10% of the readiness score">
          A site that drops into an existing route consumes a fraction of the technician time that an isolated site does
          for the same number of interventions. Two sites with identical turf and identical machines can land on opposite
          sides of the underwriting threshold on travel alone.
        </Callout>
      </div>

      <Card title="Cluster detail" dense className="mb-4">
        <Table>
          <thead>
            <tr>
              <Th>Property</Th>
              <Th align="right">Nearest deployment</Th>
              <Th align="right">5 mi</Th>
              <Th align="right">10 mi</Th>
              <Th align="right">15 mi</Th>
              <Th align="right">25 mi</Th>
              <Th align="right">50 mi</Th>
              <Th align="right">Cluster acres</Th>
              <Th align="right">Travel</Th>
              <Th align="right">Annual travel cost</Th>
              <Th align="right">Score</Th>
              <Th>Classification</Th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.property.id} className="hover:bg-ink-50">
                <Td>
                  <Link href={propertyHref(r.property.id, "cluster")} className="font-semibold text-accent-700 hover:underline">
                    {r.property.intake.name || "Untitled"}
                  </Link>
                  <div className="text-[11px] text-ink-400">
                    {[r.property.intake.city, r.property.intake.state].filter(Boolean).join(", ")}
                  </div>
                </Td>
                <Td align="right" numeric>{number(r.property.cluster.distanceToNearestDeploymentMiles, 0)} mi</Td>
                <Td align="right" numeric>{r.property.cluster.machinesWithin5Miles}</Td>
                <Td align="right" numeric>{r.property.cluster.machinesWithin10Miles}</Td>
                <Td align="right" numeric>{r.property.cluster.machinesWithin15Miles}</Td>
                <Td align="right" numeric>{r.property.cluster.machinesWithin25Miles}</Td>
                <Td align="right" numeric>{r.property.cluster.machinesWithin50Miles}</Td>
                <Td align="right" numeric>{number(r.property.cluster.autonomousAcresInCluster, 0)}</Td>
                <Td align="right" numeric>{r.property.cluster.technicianTravelMinutes} min</Td>
                <Td align="right" numeric>{money(r.stabilizedCost.lines.travel)}</Td>
                <Td align="right" numeric className="font-semibold">{Math.round(r.cluster.score)}</Td>
                <Td><ClusterBadge classification={r.cluster.classification} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title="Cluster components by property">
          <div className="space-y-4">
            {results.map((r) => (
              <div key={r.property.id}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[12.5px] font-semibold text-ink-900">{r.property.intake.name || "Untitled"}</span>
                  <span className="tnum text-[12.5px] text-ink-600">{Math.round(r.cluster.score)}</span>
                </div>
                <div className="space-y-1.5 pl-2">
                  <ScoreBar score={r.cluster.components.proximity} label="Proximity" right={Math.round(r.cluster.components.proximity)} height="h-1" />
                  <ScoreBar score={r.cluster.components.machineDensity} label="Machine density" right={Math.round(r.cluster.components.machineDensity)} height="h-1" />
                  <ScoreBar score={r.cluster.components.travelEfficiency} label="Travel efficiency" right={Math.round(r.cluster.components.travelEfficiency)} height="h-1" />
                  <ScoreBar score={r.cluster.components.acreDensity} label="Acre density" right={Math.round(r.cluster.components.acreDensity)} height="h-1" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Classification thresholds">
            <div className="space-y-2 text-[12.5px] text-ink-700">
              <p>
                <strong>{CLUSTER_CLASSIFICATION_LABELS.dense_highly_additive}</strong> — cluster score at or above{" "}
                {assumptions.cluster.denseScoreMin}.
              </p>
              <p>
                <strong>{CLUSTER_CLASSIFICATION_LABELS.building_density}</strong> — score at or above{" "}
                {assumptions.cluster.buildingScoreMin}.
              </p>
              <p>
                <strong>{CLUSTER_CLASSIFICATION_LABELS.isolated}</strong> — below {assumptions.cluster.buildingScoreMin}.
              </p>
              <p>
                <strong>{CLUSTER_CLASSIFICATION_LABELS.strategic_exception}</strong> — set manually on the property with a
                written rationale.
              </p>
            </div>
          </Card>

          <Card title="Deployment map">
            <div className="flex h-56 items-center justify-center rounded border border-dashed border-ink-300 bg-ink-50">
              <div className="px-6 text-center">
                <div className="label-caps">Map placeholder</div>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-500">
                  Phase 2 renders the deployment map here: existing machines, service radii, technician routes and the
                  candidate property. Distances and machine counts are entered by hand until then.
                </p>
              </div>
            </div>
          </Card>

          <PlaceholderNote>
            Geocoding, drive-time isochrones and live fleet positions all sit behind the manual inputs on each
            property&apos;s Cluster tab.
          </PlaceholderNote>
        </div>
      </div>
    </>
  );
}
