"use client";

import { Badge, type Tone } from "@/components/ui";
import type { ClusterClassification, DecisionStatus, ReadinessBand } from "@/lib/types";
import { CLUSTER_CLASSIFICATION_LABELS, DECISION_STATUS_LABELS } from "@/lib/types";

export const DECISION_TONE: Record<DecisionStatus, Tone> = {
  pursue: "good",
  pursue_subject_to_site_visit: "accent",
  pilot_candidate: "accent",
  conditional: "warn",
  reject: "bad",
};

export function DecisionBadge({ decision, overridden }: { decision: DecisionStatus; overridden?: boolean }) {
  return (
    <Badge tone={DECISION_TONE[decision]}>
      {DECISION_STATUS_LABELS[decision]}
      {overridden ? " · manual" : ""}
    </Badge>
  );
}

export const BAND_TONE: Record<ReadinessBand, Tone> = {
  strong: "good",
  candidate: "accent",
  conditional: "warn",
  poor: "bad",
};

export const CLUSTER_TONE: Record<ClusterClassification, Tone> = {
  dense_highly_additive: "good",
  building_density: "accent",
  isolated: "bad",
  strategic_exception: "warn",
};

export function ClusterBadge({ classification }: { classification: ClusterClassification }) {
  return <Badge tone={CLUSTER_TONE[classification]}>{CLUSTER_CLASSIFICATION_LABELS[classification]}</Badge>;
}

export function VerdictBadge({ verdict }: { verdict: "target" | "conditional" | "watch" }) {
  const tone: Tone = verdict === "target" ? "good" : verdict === "conditional" ? "warn" : "bad";
  const label = verdict === "target" ? "Target" : verdict === "conditional" ? "Conditional" : "Watch / Reject";
  return <Badge tone={tone}>{label}</Badge>;
}
