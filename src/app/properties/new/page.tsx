"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app-shell";
import { IntakeForm } from "@/components/forms/intake-form";
import { Button, Callout, Card } from "@/components/ui";
import { createEmptyProperty } from "@/lib/defaults";
import { useStore } from "@/lib/store";
import type { Property } from "@/lib/types";

export default function NewEvaluationPage() {
  const router = useRouter();
  const { ready, createProperty, replaceProperty } = useStore();

  // The draft is held locally and only written to the store when the operator
  // saves, so browsing to this page and leaving does not litter the book with
  // empty "Untitled property" records.
  const blank = useMemo(() => createEmptyProperty("draft"), []);
  const [draft, setDraft] = useState<Property>(blank);
  const [saving, setSaving] = useState(false);

  const update = (mutate: (d: Property) => void) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      mutate(next);
      return next;
    });
  };

  const dirty = JSON.stringify({ ...draft, createdAt: "", updatedAt: "" }) !== JSON.stringify({ ...blank, createdAt: "", updatedAt: "" });

  const save = (destination: "assessment" | "overview") => {
    if (saving) return;
    setSaving(true);
    const created = createProperty();
    const merged: Property = {
      ...draft,
      id: created.id,
      createdAt: created.createdAt,
      updatedAt: new Date().toISOString(),
    };
    replaceProperty(merged);
    router.push(destination === "assessment" ? `/properties/${created.id}/assessment` : `/properties/${created.id}`);
  };

  if (!ready) return <div className="py-16 text-center text-[13px] text-ink-400">Loading…</div>;

  return (
    <>
      <PageHeader
        title="New Evaluation"
        subtitle="Step 1 of the workflow: property intake. Nothing is saved to the book until you save."
        actions={
          <>
            <Button onClick={() => router.push("/properties")}>Cancel</Button>
            <Button variant="primary" disabled={saving} onClick={() => save("assessment")}>
              Save and continue to Site Assessment
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <Callout tone="accent" title="What this screen is for">
          Capture who owns the property, what the incumbent is being paid to mow it, and how quickly that contract can be
          terminated. The last point drives the entire capital-risk pricing model — a 30-day terminable incumbent
          contract tells you the customer expects the same flexibility from us.
        </Callout>
      </div>

      <IntakeForm property={draft} update={update} />

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] text-ink-500">
            {dirty
              ? "Next: site geometry, obstacle counts and the qualitative ratings that produce the Robot Readiness Score."
              : "Enter at least a property name before saving."}
          </p>
          <div className="flex gap-2">
            <Button disabled={saving} onClick={() => save("overview")}>
              Save and review summary
            </Button>
            <Button variant="primary" disabled={saving} onClick={() => save("assessment")}>
              Save and continue to Site Assessment
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
