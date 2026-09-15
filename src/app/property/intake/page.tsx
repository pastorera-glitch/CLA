"use client";

import { IntakeForm } from "@/components/forms/intake-form";
import { PropertyWorkspace } from "@/components/property-page";

export default function IntakePage() {
  return (
    <PropertyWorkspace
      title="Property Intake"
      subtitle="Ownership, incumbent spend and contract terms. GIS and aerial measurement integrations are placeholders."
    >
      {({ property, update }) => <IntakeForm property={property} update={update} />}
    </PropertyWorkspace>
  );
}
