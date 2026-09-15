"use client";

import { PropertyWorkspace } from "@/components/property-page";
import {
  FieldGrid,
  NumberField,
  PercentField,
  RatingField,
  SelectField,
  TextAreaField,
} from "@/components/fields";
import { Badge, Callout, Card, PlaceholderNote, ScoreBar, StatTile, scoreTone } from "@/components/ui";
import { RATING_SCALES } from "@/lib/defaults";
import { acres, number, pct } from "@/lib/format";
import type { SiteRatingKey } from "@/lib/types";

const OBSTACLE_FIELDS: Array<{ key: keyof import("@/lib/types").SiteGeometry; label: string; suffix?: string; help?: string }> = [
  { key: "roadCrossings", label: "Road crossings", help: "Highest-consequence autonomy event. Weighted 2.5x." },
  { key: "sidewalkCrossings", label: "Sidewalk crossings" },
  { key: "gates", label: "Gates" },
  { key: "narrowPassages", label: "Narrow passages" },
  { key: "curbLinearFeet", label: "Curbs", suffix: "lf" },
  { key: "retainingWalls", label: "Retaining walls" },
  { key: "landscapeBeds", label: "Landscape beds" },
  { key: "trees", label: "Trees" },
  { key: "lightPoles", label: "Light poles" },
  { key: "signage", label: "Signage" },
  { key: "drainageStructures", label: "Drainage structures" },
  { key: "waterHazards", label: "Ponds / water hazards" },
  { key: "steepSlopeAreas", label: "Steep slope areas" },
  { key: "irregularTurfAreas", label: "Irregular turf areas" },
];

const RATING_KEYS: SiteRatingKey[] = [
  "turfFragmentation",
  "slopeDifficulty",
  "obstacleDensity",
  "edgeComplexity",
  "groundQuality",
  "drainageWetAreas",
  "debrisExposure",
  "pedestrianInteraction",
  "vehicleInteraction",
  "vandalismTheftExposure",
  "gpsRtkVisibility",
  "cellularConnectivity",
  "chargingStationSuitability",
];

export default function AssessmentPage() {
  return (
    <PropertyWorkspace
      title="Site Geometry & Turf Assessment"
      subtitle="Measurements and qualitative ratings feed the Robot Readiness Score directly. Every rating is oriented so 5 is the most favorable condition for autonomous mowing."
    >
      {({ property, result, update }) => {
        const g = property.assessment.geometry;
        const a = property.assessment;
        const setG = <K extends keyof typeof g>(key: K, value: (typeof g)[K]) =>
          update((d) => {
            d.assessment.geometry[key] = value;
          });

        const contiguousShare = g.totalTurfAcres > 0 ? (g.contiguousTurfAcres / g.totalTurfAcres) * 100 : 0;
        const acresPerZone = g.mowingZoneCount > 0 ? g.totalTurfAcres / g.mowingZoneCount : 0;

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatTile
                label="Robot Readiness"
                value={Math.round(result.readiness.score)}
                tone={scoreTone(result.readiness.score)}
                sub={result.readiness.bandLabel}
              />
              <StatTile label="Autonomous acres" value={number(result.equipment.autonomousAcres, 2)} sub={`of ${acres(g.totalTurfAcres)} turf`} />
              <StatTile label="Contiguous turf" value={pct(contiguousShare, 0)} sub={`${acres(g.contiguousTurfAcres)} contiguous`} />
              <StatTile label="Acres per zone" value={number(acresPerZone, 2)} sub={`${g.mowingZoneCount} mowing zones`} />
              <StatTile
                label="Manual finishing"
                value={pct(a.perimeterManualFinishPct, 0)}
                sub="of perimeter still needs a trimmer"
              />
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
                <Card title="Turf geometry">
                  <FieldGrid>
                    <NumberField label="Total turf acreage" value={g.totalTurfAcres} onChange={(v) => setG("totalTurfAcres", v)} suffix="ac" min={0} />
                    <NumberField label="Contiguous turf acreage" value={g.contiguousTurfAcres} onChange={(v) => setG("contiguousTurfAcres", v)} suffix="ac" min={0} help={`${number(contiguousShare, 0)}% of total turf`} />
                    <NumberField label="Separate mowing zones" value={g.mowingZoneCount} onChange={(v) => setG("mowingZoneCount", v)} min={1} step={1} />
                    <NumberField label="Largest contiguous zone" value={g.largestZoneAcres} onChange={(v) => setG("largestZoneAcres", v)} suffix="ac" min={0} />
                    <NumberField label="Average mowing-zone size" value={g.averageZoneAcres} onChange={(v) => setG("averageZoneAcres", v)} suffix="ac" min={0} help={`Computed from inputs: ${number(acresPerZone, 2)} ac`} />
                    <NumberField label="Turf perimeter" value={g.turfPerimeterLinearFeet} onChange={(v) => setG("turfPerimeterLinearFeet", v)} suffix="lf" min={0} help="Drives the residual trimming estimate." />
                  </FieldGrid>
                  <div className="mt-4 border-t border-ink-100 pt-4">
                    <FieldGrid cols={2}>
                      <PercentField
                        label="Turf estimated autonomous-compatible"
                        value={g.autonomousCompatiblePct}
                        onChange={(v) => setG("autonomousCompatiblePct", v)}
                        help="The heaviest single input in the model. This is the portion a robot can actually cut — not the portion that is grass."
                      />
                      <NumberField label="Max sustained slope" value={g.maxSlopePct} onChange={(v) => setG("maxSlopePct", v)} suffix="% grade" min={0} help="Compared against each platform's rated slope capability." />
                    </FieldGrid>
                  </div>
                </Card>

                <Card title="Crossings and obstacles" subtitle="Counts drive both the readiness score and the commissioning hour estimate.">
                  <FieldGrid cols={4}>
                    {OBSTACLE_FIELDS.map((f) => (
                      <NumberField
                        key={f.key}
                        label={f.label}
                        value={g[f.key] as number}
                        onChange={(v) => setG(f.key, v as never)}
                        suffix={f.suffix}
                        min={0}
                        step={f.suffix === "lf" ? 10 : 1}
                        help={f.help}
                      />
                    ))}
                  </FieldGrid>
                </Card>

                <Card title="Qualitative ratings" subtitle="1 is always the worst case for robotics and 5 the best. The endpoint labels state the direction explicitly.">
                  <FieldGrid cols={3}>
                    {RATING_KEYS.map((key) => {
                      const scale = RATING_SCALES[key];
                      return (
                        <RatingField
                          key={key}
                          label={scale.label}
                          help={scale.help}
                          low={scale.low}
                          high={scale.high}
                          value={a.ratings[key]}
                          onChange={(v) =>
                            update((d) => {
                              d.assessment.ratings[key] = v;
                            })
                          }
                        />
                      );
                    })}
                  </FieldGrid>
                </Card>

                <Card title="Finish requirements and notes">
                  <FieldGrid>
                    <PercentField
                      label="Perimeter requiring manual finishing"
                      value={a.perimeterManualFinishPct}
                      onChange={(v) => update((d) => { d.assessment.perimeterManualFinishPct = v; })}
                      help="Share of turf perimeter a human trimmer still has to touch."
                    />
                    <SelectField
                      label="Required finish quality"
                      value={String(a.requiredFinishQuality)}
                      onChange={(v) => update((d) => { d.assessment.requiredFinishQuality = Number(v) as 1 | 2 | 3 | 4 | 5; })}
                      options={[
                        { value: "1", label: "1 — Functional / utility turf" },
                        { value: "2", label: "2 — Basic commercial" },
                        { value: "3", label: "3 — Standard commercial" },
                        { value: "4", label: "4 — High-visibility commercial" },
                        { value: "5", label: "5 — Class A / showcase" },
                      ]}
                      help="Higher finish demand pushes the equipment match toward edge-capable platforms."
                    />
                  </FieldGrid>
                  <div className="mt-3">
                    <FieldGrid cols={1}>
                      <TextAreaField
                        label="Assessor notes"
                        value={a.assessorNotes}
                        onChange={(v) => update((d) => { d.assessment.assessorNotes = v; })}
                        rows={4}
                      />
                    </FieldGrid>
                  </div>
                  <div className="mt-3">
                    <PlaceholderNote>
                      Aerial imagery, drone survey and automated obstacle detection would populate most of this screen in
                      Phase 2. For now every value is an evaluator estimate and should be confirmed on site.
                    </PlaceholderNote>
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                <Card title="Readiness breakdown" subtitle="Live as you edit.">
                  <div className="space-y-3">
                    {result.readiness.categories.map((c) => (
                      <div key={c.category}>
                        <ScoreBar
                          score={c.score}
                          label={`${c.label} · ${number(c.weight, 0)}%`}
                          right={`${Math.round(c.score)}`}
                        />
                        <p className="mt-1 text-[11px] leading-snug text-ink-400">{c.detail}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Flags" subtitle="Reasons the score is being reduced. Nothing is auto-rejected.">
                  {result.readiness.flags.length === 0 ? (
                    <p className="text-[12.5px] text-ink-400">No flags raised.</p>
                  ) : (
                    <ul className="space-y-2">
                      {result.readiness.flags.map((f, i) => (
                        <li key={i} className="flex gap-2">
                          <Badge tone={f.severity === "critical" ? "bad" : f.severity === "major" ? "warn" : "neutral"}>
                            {f.severity}
                          </Badge>
                          <span className="text-[12px] leading-relaxed text-ink-700">{f.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card title="Top detractors">
                  <Callout tone="neutral">
                    These four categories account for the largest share of the points lost against a perfect score.
                  </Callout>
                  <ul className="mt-3 space-y-2">
                    {result.readiness.topDetractors.map((c) => (
                      <li key={c.category} className="flex items-baseline justify-between gap-3 border-b border-ink-100 pb-1.5">
                        <span className="text-[12.5px] text-ink-700">{c.label}</span>
                        <span className="tnum text-[12.5px] font-semibold text-bad-500">−{number(c.pointsLost, 1)} pts</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          </div>
        );
      }}
    </PropertyWorkspace>
  );
}
