"use client";

import { useState } from "react";

import { PageHeader } from "@/components/app-shell";
import { FieldGrid, FieldSection, NumberField, SelectField, TextAreaField, TextField, ToggleField } from "@/components/fields";
import { Badge, Button, Callout, Card, PlaceholderNote, Table, Td, Th } from "@/components/ui";
import { money, number } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { MarketSegment, MowerClass, MowerProduct, NavigationTech } from "@/lib/types";
import { MOWER_CLASS_LABELS, NAVIGATION_TECH_LABELS } from "@/lib/types";

const CLASSES = Object.keys(MOWER_CLASS_LABELS) as MowerClass[];
const NAV_TECHS = Object.keys(NAVIGATION_TECH_LABELS) as NavigationTech[];

export default function EquipmentCatalogPage() {
  const { ready, products, upsertProduct, deleteProduct, resetProducts } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!ready) return <div className="py-16 text-center text-[13px] text-ink-400">Loading…</div>;

  const editing = products.find((p) => p.id === editingId) ?? null;
  const verifiedCount = products.filter((p) => p.specsVerified).length;

  return (
    <>
      <PageHeader
        title="Equipment Catalog"
        subtitle={`${products.length} products · ${verifiedCount} with verified specifications.`}
        actions={
          <>
            <Button onClick={() => resetProducts()}>Reset to seed catalog</Button>
            <Button
              variant="primary"
              onClick={() => {
                const id = `custom-${Date.now().toString(36)}`;
                upsertProduct({ ...blankProduct(), id });
                setEditingId(id);
              }}
            >
              Add product
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <Callout tone="warn" title="Every seeded specification is a placeholder">
          Acreage capacity, pricing, slope ratings, warranty terms and commercial-use limitations in this catalog were
          entered to make the recommendation engine runnable. None has been verified against an OEM datasheet or a dealer
          quote. Mark a product verified only once someone has actually checked it.
        </Callout>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card title="Products" dense>
          <Table>
            <thead>
              <tr>
                <Th>Manufacturer / model</Th>
                <Th>Class</Th>
                <Th>Segment</Th>
                <Th align="right">Rec. ac</Th>
                <Th align="right">Max ac</Th>
                <Th align="right">Acquisition</Th>
                <Th align="right">Annual</Th>
                <Th>Navigation</Th>
                <Th align="right">Slope</Th>
                <Th>Verified</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={p.id === editingId ? "bg-accent-50" : "hover:bg-ink-50"}>
                  <Td>
                    <div className="font-medium text-ink-900">{p.manufacturer}</div>
                    <div className="text-[11.5px] text-ink-500">{p.model}</div>
                  </Td>
                  <Td className="whitespace-nowrap text-ink-600">{MOWER_CLASS_LABELS[p.mowerClass]}</Td>
                  <Td>
                    <Badge tone={p.segment === "commercial" ? "good" : p.segment === "prosumer" ? "warn" : "bad"}>
                      {p.segment}
                    </Badge>
                  </Td>
                  <Td align="right" numeric>{number(p.recommendedAcres, 1)}</Td>
                  <Td align="right" numeric>{number(p.maxAcres, 1)}</Td>
                  <Td align="right" numeric>{money(p.acquisitionCost)}</Td>
                  <Td align="right" numeric>{money(p.financedAnnualCost)}</Td>
                  <Td className="whitespace-nowrap text-ink-600">{NAVIGATION_TECH_LABELS[p.navigationTech]}</Td>
                  <Td align="right" numeric>{p.maxSlopePct}%</Td>
                  <Td>{p.specsVerified ? <Badge tone="good">Verified</Badge> : <Badge tone="warn">Placeholder</Badge>}</Td>
                  <Td align="right">
                    <button
                      type="button"
                      className="text-[11.5px] font-semibold text-accent-700 hover:underline"
                      onClick={() => setEditingId(p.id === editingId ? null : p.id)}
                    >
                      {p.id === editingId ? "Close" : "Edit"}
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <div className="space-y-4">
          {editing ? (
            <ProductEditor
              key={editing.id}
              product={editing}
              onChange={upsertProduct}
              onDelete={() => {
                deleteProduct(editing.id);
                setEditingId(null);
              }}
            />
          ) : (
            <Card title="Product editor">
              <p className="text-[12.5px] text-ink-500">Select a product to edit its specifications.</p>
            </Card>
          )}

          <PlaceholderNote>
            OEM API integrations, telemetry feeds and live dealer pricing sit here in Phase 2. For now the catalog is a
            hand-maintained table and every recommendation inherits its accuracy.
          </PlaceholderNote>
        </div>
      </div>
    </>
  );
}

function ProductEditor({
  product,
  onChange,
  onDelete,
}: {
  product: MowerProduct;
  onChange: (p: MowerProduct) => void;
  onDelete: () => void;
}) {
  const set = <K extends keyof MowerProduct>(key: K, value: MowerProduct[K]) =>
    onChange({ ...product, [key]: value });

  return (
    <Card
      title={`${product.manufacturer} ${product.model}`}
      subtitle={product.sourceNote}
      actions={
        <Button variant="danger" onClick={onDelete}>
          Delete
        </Button>
      }
    >
      <div className="space-y-4">
        <FieldSection title="Identity">
          <FieldGrid cols={2}>
            <TextField label="Manufacturer" value={product.manufacturer} onChange={(v) => set("manufacturer", v)} />
            <TextField label="Model" value={product.model} onChange={(v) => set("model", v)} />
            <SelectField<MowerClass>
              label="Mower class"
              value={product.mowerClass}
              onChange={(v) => set("mowerClass", v)}
              options={CLASSES.map((c) => ({ value: c, label: MOWER_CLASS_LABELS[c] }))}
            />
            <SelectField<MarketSegment>
              label="Market segment"
              value={product.segment}
              onChange={(v) => set("segment", v)}
              options={[
                { value: "residential", label: "Residential" },
                { value: "prosumer", label: "Prosumer" },
                { value: "commercial", label: "Commercial" },
              ]}
            />
          </FieldGrid>
        </FieldSection>

        <FieldSection title="Cost">
          <FieldGrid cols={2}>
            <NumberField label="MSRP" value={product.msrp} onChange={(v) => set("msrp", v)} suffix="$" min={0} />
            <NumberField label="Acquisition cost" value={product.acquisitionCost} onChange={(v) => set("acquisitionCost", v)} suffix="$" min={0} />
            <NumberField label="Financed / leased annual cost" value={product.financedAnnualCost} onChange={(v) => set("financedAnnualCost", v)} suffix="$/yr" min={0} />
            <NumberField label="Residual value" value={product.residualValuePct} onChange={(v) => set("residualValuePct", v)} suffix="%" min={0} max={100} />
            <NumberField label="Useful life" value={product.usefulLifeYears} onChange={(v) => set("usefulLifeYears", v)} suffix="yr" min={1} />
            <NumberField label="Warranty" value={product.warrantyMonths} onChange={(v) => set("warrantyMonths", v)} suffix="mo" min={0} />
          </FieldGrid>
        </FieldSection>

        <FieldSection title="Capacity and cutting">
          <FieldGrid cols={2}>
            <NumberField label="Recommended acreage" value={product.recommendedAcres} onChange={(v) => set("recommendedAcres", v)} suffix="ac" min={0} step={0.1} />
            <NumberField label="Maximum acreage" value={product.maxAcres} onChange={(v) => set("maxAcres", v)} suffix="ac" min={0} step={0.1} />
            <NumberField label="Cutting width" value={product.cuttingWidthInches} onChange={(v) => set("cuttingWidthInches", v)} suffix="in" min={0} step={0.1} />
            <NumberField label="Runtime" value={product.runtimeMinutes} onChange={(v) => set("runtimeMinutes", v)} suffix="min" min={0} />
            <NumberField label="Charge time" value={product.chargeMinutes} onChange={(v) => set("chargeMinutes", v)} suffix="min" min={0} />
            <NumberField label="Max slope" value={product.maxSlopePct} onChange={(v) => set("maxSlopePct", v)} suffix="%" min={0} />
            <NumberField label="Edge-cutting capability" value={product.edgeCuttingCapability} onChange={(v) => set("edgeCuttingCapability", Math.min(5, Math.max(1, Math.round(v))) as 1 | 2 | 3 | 4 | 5)} suffix="/5" min={1} max={5} step={1} />
            <NumberField label="Multi-zone support" value={product.multiZoneSupport} onChange={(v) => set("multiZoneSupport", v)} suffix="zones" min={1} step={1} />
          </FieldGrid>
        </FieldSection>

        <FieldSection title="Navigation and connectivity">
          <FieldGrid cols={2}>
            <SelectField<NavigationTech>
              label="Navigation technology"
              value={product.navigationTech}
              onChange={(v) => set("navigationTech", v)}
              options={NAV_TECHS.map((n) => ({ value: n, label: NAVIGATION_TECH_LABELS[n] }))}
            />
            <SelectField
              label="Obstacle detection"
              value={product.obstacleDetection}
              onChange={(v) => set("obstacleDetection", v)}
              options={[
                { value: "none", label: "None" },
                { value: "bump", label: "Bump" },
                { value: "ultrasonic", label: "Ultrasonic" },
                { value: "vision", label: "Vision" },
                { value: "vision_lidar", label: "Vision + LiDAR" },
              ]}
            />
            <ToggleField label="Requires RTK" value={product.requiresRtk} onChange={(v) => set("requiresRtk", v)} />
            <ToggleField label="Requires cellular" value={product.requiresCellular} onChange={(v) => set("requiresCellular", v)} />
            <ToggleField label="Vision capability" value={product.hasVision} onChange={(v) => set("hasVision", v)} />
            <ToggleField label="Active trimming" value={product.activeTrimming} onChange={(v) => set("activeTrimming", v)} />
          </FieldGrid>
        </FieldSection>

        <FieldSection title="Fleet operations">
          <FieldGrid cols={2}>
            <ToggleField label="Fleet management" value={product.fleetManagement} onChange={(v) => set("fleetManagement", v)} />
            <ToggleField label="Remote diagnostics" value={product.remoteDiagnostics} onChange={(v) => set("remoteDiagnostics", v)} />
            <ToggleField label="API available" value={product.apiAvailable} onChange={(v) => set("apiAvailable", v)} />
            <NumberField label="Service network" value={product.serviceNetwork} onChange={(v) => set("serviceNetwork", Math.min(5, Math.max(1, Math.round(v))) as 1 | 2 | 3 | 4 | 5)} suffix="/5" min={1} max={5} step={1} />
            <ToggleField label="Specifications verified" value={product.specsVerified} onChange={(v) => set("specsVerified", v)} help="Set only after someone has checked the datasheet." />
          </FieldGrid>
        </FieldSection>

        <FieldSection title="Notes">
          <FieldGrid cols={1}>
            <TextAreaField label="Commercial-use limitations" value={product.commercialUseLimitations} onChange={(v) => set("commercialUseLimitations", v)} rows={3} />
            <TextAreaField label="Source note" value={product.sourceNote} onChange={(v) => set("sourceNote", v)} rows={2} />
          </FieldGrid>
        </FieldSection>
      </div>
    </Card>
  );
}

function blankProduct(): MowerProduct {
  return {
    id: "",
    manufacturer: "New manufacturer",
    model: "New model",
    mowerClass: "commercial_mid",
    segment: "commercial",
    msrp: 0,
    acquisitionCost: 0,
    financedAnnualCost: 0,
    recommendedAcres: 1,
    maxAcres: 2,
    cuttingWidthInches: 20,
    runtimeMinutes: 180,
    chargeMinutes: 120,
    navigationTech: "rtk_gnss",
    requiresRtk: true,
    requiresCellular: true,
    hasVision: false,
    obstacleDetection: "ultrasonic",
    maxSlopePct: 45,
    edgeCuttingCapability: 3,
    activeTrimming: false,
    fleetManagement: true,
    remoteDiagnostics: true,
    apiAvailable: false,
    warrantyMonths: 24,
    usefulLifeYears: 5,
    residualValuePct: 15,
    multiZoneSupport: 4,
    commercialUseLimitations: "",
    serviceNetwork: 3,
    specsVerified: false,
    sourceNote: "Entered manually. Verify before use.",
  };
}
