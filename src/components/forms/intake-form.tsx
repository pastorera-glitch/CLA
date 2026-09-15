"use client";

import { Card, PlaceholderNote } from "@/components/ui";
import {
  FieldGrid,
  FieldSection,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/fields";
import { money, number } from "@/lib/format";
import type { Property, PropertyType, TerminationProvision } from "@/lib/types";
import {
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  TERMINATION_PROVISIONS,
  TERMINATION_PROVISION_LABELS,
} from "@/lib/types";

export function IntakeForm({
  property,
  update,
}: {
  property: Property;
  update: (mutate: (draft: Property) => void) => void;
}) {
  const i = property.intake;
  const set = <K extends keyof Property["intake"]>(key: K, value: Property["intake"][K]) =>
    update((d) => {
      d.intake[key] = value;
    });

  const turfShare = i.parcelAcres > 0 ? (i.estimatedTurfAcres / i.parcelAcres) * 100 : 0;
  const mowingShare = i.existingAnnualLandscapeCost > 0 ? (i.estimatedMowingOnlyCost / i.existingAnnualLandscapeCost) * 100 : 0;
  const costPerVisit = i.annualMowingVisits > 0 ? i.estimatedMowingOnlyCost / i.annualMowingVisits : 0;
  const costPerAcre = i.estimatedTurfAcres > 0 ? i.estimatedMowingOnlyCost / i.estimatedTurfAcres : 0;

  return (
    <div className="space-y-4">
      <Card title="Property identification">
        <FieldGrid>
          <TextField label="Property name" value={i.name} onChange={(v) => set("name", v)} placeholder="e.g. Northgate Logistics Center" />
          <TextField label="Street address" value={i.addressLine1} onChange={(v) => set("addressLine1", v)} />
          <SelectField<PropertyType>
            label="Property type"
            value={i.propertyType}
            onChange={(v) => set("propertyType", v)}
            options={PROPERTY_TYPES.map((t) => ({ value: t, label: PROPERTY_TYPE_LABELS[t] }))}
          />
          <TextField label="City" value={i.city} onChange={(v) => set("city", v)} />
          <TextField label="State" value={i.state} onChange={(v) => set("state", v)} />
          <TextField label="Postal code" value={i.postalCode} onChange={(v) => set("postalCode", v)} />
          <TextField label="Owner" value={i.owner} onChange={(v) => set("owner", v)} />
          <TextField label="Property manager" value={i.propertyManager} onChange={(v) => set("propertyManager", v)} />
          <TextField label="Existing landscaper" value={i.existingLandscaper} onChange={(v) => set("existingLandscaper", v)} />
        </FieldGrid>
      </Card>

      <Card
        title="Measurements"
        subtitle="Manual entry for the MVP. GIS, parcel and aerial measurement integrations will replace these fields."
      >
        <FieldSection title="Area">
          <FieldGrid>
            <NumberField label="Total parcel acreage" value={i.parcelAcres} onChange={(v) => set("parcelAcres", v)} suffix="ac" min={0} />
            <NumberField
              label="Estimated turf acreage"
              value={i.estimatedTurfAcres}
              onChange={(v) => set("estimatedTurfAcres", v)}
              suffix="ac"
              min={0}
              help={turfShare > 0 ? `${number(turfShare, 1)}% of the parcel` : undefined}
            />
          </FieldGrid>
        </FieldSection>

        <FieldSection title="Future GIS / aerial integration" description="Not yet connected. Fields are stored so the data model is ready.">
          <FieldGrid>
            <SelectField
              label="Measurement source"
              value={i.gis.measurementSource}
              onChange={(v) => update((d) => { d.intake.gis.measurementSource = v; })}
              options={[
                { value: "manual", label: "Manual entry" },
                { value: "aerial_estimate", label: "Aerial estimate (not wired)" },
                { value: "gis_import", label: "GIS import (not wired)" },
              ]}
            />
            <TextField label="Parcel ID" value={i.gis.parcelId} onChange={(v) => update((d) => { d.intake.gis.parcelId = v; })} placeholder="County parcel / APN" />
            <TextField label="Aerial image URL" value={i.gis.aerialImageUrl} onChange={(v) => update((d) => { d.intake.gis.aerialImageUrl = v; })} placeholder="https://…" />
          </FieldGrid>
          <div className="mt-3">
            <PlaceholderNote>
              Aerial imagery, parcel boundary data and automated turf-polygon measurement are Phase 2. Until then the
              engine uses the manual acreage above, and every readiness score inherits that uncertainty.
            </PlaceholderNote>
          </div>
        </FieldSection>
      </Card>

      <Card title="Incumbent landscaping spend" subtitle="Mowing-only cost is the number that matters. Total landscaping spend is not a substitute.">
        <FieldGrid>
          <NumberField
            label="Existing annual landscaping cost"
            value={i.existingAnnualLandscapeCost}
            onChange={(v) => set("existingAnnualLandscapeCost", v)}
            suffix="$/yr"
            min={0}
          />
          <NumberField
            label="Estimated mowing-only cost"
            value={i.estimatedMowingOnlyCost}
            onChange={(v) => set("estimatedMowingOnlyCost", v)}
            suffix="$/yr"
            min={0}
            help={mowingShare > 0 ? `${number(mowingShare, 0)}% of total landscaping spend` : undefined}
          />
          <NumberField
            label="Annual mowing visits"
            value={i.annualMowingVisits}
            onChange={(v) => set("annualMowingVisits", v)}
            suffix="/yr"
            min={0}
            help={costPerVisit > 0 ? `${money(costPerVisit)} per visit` : undefined}
          />
        </FieldGrid>
        {costPerAcre > 0 && (
          <p className="mt-3 text-[12px] text-ink-500">
            Implied incumbent rate: <span className="tnum font-semibold text-ink-800">{money(costPerAcre)}</span> per turf
            acre per year
            {i.annualMowingVisits > 0 && (
              <>
                {" "}
                · <span className="tnum font-semibold text-ink-800">{money(costPerAcre / i.annualMowingVisits)}</span> per
                acre per visit
              </>
            )}
            . This is the ceiling on what we can charge before the value story has to carry the deal.
          </p>
        )}
      </Card>

      <Card title="Incumbent contract" subtitle="Termination terms drive how much capital we can safely deploy.">
        <FieldGrid>
          <SelectField<TerminationProvision>
            label="Termination provision"
            value={i.terminationProvision}
            onChange={(v) => set("terminationProvision", v)}
            options={TERMINATION_PROVISIONS.map((t) => ({ value: t, label: TERMINATION_PROVISION_LABELS[t] }))}
          />
          <TextField
            label="Contract expiration"
            type="date"
            value={i.contractExpiration}
            onChange={(v) => set("contractExpiration", v)}
          />
        </FieldGrid>
        <div className="mt-3">
          <FieldGrid cols={1}>
            <TextAreaField label="Notes" value={i.notes} onChange={(v) => set("notes", v)} rows={4} />
          </FieldGrid>
        </div>
      </Card>
    </div>
  );
}
