import type { AnyMetadataField } from "../../data/metadata";

/**
 * Single source of truth for the metadata grid's column rhythm. The body grid is
 * `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`; cards pick one of three widths
 * instead of hand-rolling col-span strings.
 */
export type CardSpan = "single" | "wide" | "full";

const SPAN_CLASS: Record<CardSpan, string> = {
  single: "col-span-1",
  wide: "col-span-1 md:col-span-2",
  full: "col-span-1 md:col-span-2 xl:col-span-3",
};

export function spanClass(span: CardSpan): string {
  return SPAN_CLASS[span];
}

/** Width a scalar field's card should occupy: large fields get more room. */
export function fieldSpan(field: AnyMetadataField): CardSpan {
  if (field.type === "multiline") return "full";
  if (field.type === "file-list") return "wide";
  return "single";
}
