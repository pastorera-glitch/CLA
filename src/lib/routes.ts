/**
 * Single source of truth for property workspace URLs.
 *
 * The property id travels as a query parameter rather than a path segment
 * (`/property/assessment?id=…` instead of `/properties/<id>/assessment`) so the
 * whole app can be statically exported: ids are created in the browser, so a
 * dynamic path segment could never be enumerated at build time.
 */
export const PROPERTY_TABS = [
  "",
  "intake",
  "assessment",
  "cluster",
  "equipment",
  "intervention",
  "residual",
  "value",
  "contract",
  "economics",
  "report",
] as const;

export type PropertyTab = (typeof PROPERTY_TABS)[number];

export function propertyHref(id: string, tab: PropertyTab = ""): string {
  const base = tab ? `/property/${tab}` : "/property";
  return `${base}?id=${encodeURIComponent(id)}`;
}
