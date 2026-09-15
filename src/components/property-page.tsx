"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/app-shell";
import { DecisionBadge } from "@/components/decision";
import { PropertyNav } from "@/components/property-nav";
import { Badge, Button, EmptyState } from "@/components/ui";
import type { UnderwritingResult } from "@/lib/engine";
import { propertyHref } from "@/lib/routes";
import { useStore, useUnderwriting } from "@/lib/store";
import type { Property } from "@/lib/types";
import { PROPERTY_TYPE_LABELS } from "@/lib/types";

export interface PropertyPageRenderProps {
  property: Property;
  result: UnderwritingResult;
  update: (mutate: (draft: Property) => void) => void;
}

interface WorkspaceProps {
  title: string;
  subtitle?: ReactNode;
  actions?: (p: PropertyPageRenderProps) => ReactNode;
  children: (p: PropertyPageRenderProps) => ReactNode;
}

/**
 * Shared wrapper for every property workspace tab: resolves the property from
 * the `?id=` query parameter, runs the engine and hands the page a live
 * property plus an update function.
 */
export function PropertyWorkspace(props: WorkspaceProps) {
  // useSearchParams needs a Suspense boundary for the static export to prerender.
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <PropertyWorkspaceInner {...props} />
    </Suspense>
  );
}

export function WorkspaceLoading() {
  return <div className="py-16 text-center text-[13px] text-ink-400">Loading…</div>;
}

function PropertyWorkspaceInner({ title, subtitle, actions, children }: WorkspaceProps) {
  const id = useSearchParams().get("id") ?? "";
  const { ready, getProperty, updateProperty } = useStore();
  const property = getProperty(id);
  const result = useUnderwriting(property);

  if (!ready) return <WorkspaceLoading />;
  if (!property || !result) {
    return (
      <EmptyState title="Property not found">
        This evaluation does not exist or was deleted.
        <div className="mt-3">
          <Button href="/properties" variant="primary">
            Back to properties
          </Button>
        </div>
      </EmptyState>
    );
  }

  const renderProps: PropertyPageRenderProps = {
    property,
    result,
    update: (mutate) => updateProperty(id, mutate),
  };

  return (
    <>
      <PageHeader
        title={property.intake.name || "Untitled property"}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              {[property.intake.addressLine1, property.intake.city, property.intake.state]
                .filter(Boolean)
                .join(", ") || "No address entered"}
            </span>
            <Badge>{PROPERTY_TYPE_LABELS[property.intake.propertyType]}</Badge>
            <DecisionBadge
              decision={result.recommendation.decision}
              overridden={result.recommendation.decisionIsOverridden}
            />
          </span>
        }
        actions={
          <>
            {actions?.(renderProps)}
            <Button href={propertyHref(id, "report")}>Report</Button>
          </>
        }
      />
      <PropertyNav id={id} />
      <section className="mb-3">
        <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-500">{subtitle}</p>}
      </section>
      {children(renderProps)}
    </>
  );
}
