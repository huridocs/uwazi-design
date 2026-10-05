import { useLayoutEffect, useMemo, useRef } from "react";
import { EntityCard } from "../library/EntityCard";
import { registerPreviewType, type Entity } from "../../data/entities";
import type { ThesaurusValue } from "../../data/settings";
import type { PropertyDef } from "../../data/templates/types";

/** Fixed id for the ephemeral preview type — never collides with a real
 *  template id (see registerPreviewType's lookup order). */
const PREVIEW_TYPE_ID = "settings-template-preview";

const noop = () => {};

/** Calm, deterministic demo values by property type. Cycled by position so two
 *  text fields don't read identically. */
const TEXT_SAMPLES = ["Ref. 2026-014", "A short sample value", "San José, Costa Rica"];
const DATE_SAMPLES = ["12 May 2024", "3 Feb 2023", "28 Nov 2021"];

/** The first pickable value of a thesaurus (a group's own label is a heading). */
function firstValue(values: ThesaurusValue[] | undefined): string | undefined {
  const first = values?.[0];
  return first?.values?.length ? first.values[0].label : first?.label;
}

function demoValueFor(p: PropertyDef, valuesOf: (thesaurusId: string) => ThesaurusValue[] | undefined, index: number): string | null {
  switch (p.type) {
    case "text":
    case "markdown":
      return p.type === "markdown" ? "A short descriptive paragraph about this entity." : TEXT_SAMPLES[index % TEXT_SAMPLES.length];
    case "date":
    case "multidate":
      return DATE_SAMPLES[index % DATE_SAMPLES.length];
    case "daterange":
    case "multidaterange":
      return "3 Feb 2023 – 12 May 2024";
    case "numeric":
      return "128";
    case "select":
    case "multiselect":
      return (p.content && firstValue(valuesOf(p.content))) ?? "First option";
    case "link":
      return "Case file";
    case "geolocation":
      return "Guatemala City";
    case "generatedid":
      return "7KQ2M9XA";
    // Relationships resolve to connected entities, and pictures, previews and
    // media never show as card lines: none has a plausible line here.
    default:
      return null;
  }
}

/** Live Library-card preview for the template being edited. Reuses the REAL
 *  `EntityCard` (not a lookalike) over a demo entity derived from the draft:
 *  name → type pill, colour → dot, Show in cards properties → demo lines in
 *  template order.
 *
 *  It's a picture, not a control: the wrapper is `inert` + `aria-hidden` +
 *  `pointer-events-none`, so the card's internal buttons never reach mouse,
 *  keyboard, or AT. `highlight` marks one property's line (UX7: the row
 *  hovered or focused in the property table). */
export function TemplateCardPreview({
  name,
  color,
  properties,
  valuesOf,
  highlight,
  className = "",
}: {
  name: string;
  color: string;
  properties: PropertyDef[];
  /** A thesaurus's values, for a select's demo value. */
  valuesOf: (thesaurusId: string) => ThesaurusValue[] | undefined;
  /** The property id whose line to mark, if it is on the card. */
  highlight?: string | null;
  className?: string;
}) {
  const entity: Entity = useMemo(() => {
    const displayName = name.trim() || "Untitled template";
    // Register BEFORE the card renders so getEntityType resolves the live
    // name/colour this render (idempotent — safe under StrictMode).
    registerPreviewType({ id: PREVIEW_TYPE_ID, name: displayName, color });
    return {
      id: "template-preview-entity",
      title: `Sample ${displayName.toLowerCase()}`,
      typeId: PREVIEW_TYPE_ID,
      fields: properties
        .filter((p) => p.showInCard)
        .map((p, i) => {
          const value = demoValueFor(p, valuesOf, i);
          return value ? { key: p.id, label: p.label, value } : null;
        })
        .filter((f): f is { key: string; label: string; value: string } => f !== null),
    };
  }, [name, color, properties, valuesOf]);

  const cardRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const root = cardRef.current;
    if (!root) return;
    for (const el of root.querySelectorAll<HTMLElement>("[data-field]")) {
      const on = !!highlight && el.dataset.field === highlight;
      el.classList.toggle("bg-parchment", on);
      el.classList.toggle("rounded-sm", on);
      el.classList.toggle("outline", on);
      el.classList.toggle("outline-4", on);
      el.classList.toggle("outline-parchment", on);
    }
  }, [highlight, entity]);

  return (
    <section data-component="TemplateCardPreview" className={className}>
      <h3 className="text-sm font-semibold text-ink mb-1">Card preview</h3>
      <p className="text-xs text-ink-tertiary mb-3">How entities of this template appear in the Library.</p>
      <div
        data-part="card"
        aria-hidden="true"
        className="pointer-events-none select-none max-w-[16.5rem]"
        // React 18 has no `inert` prop; set the attribute directly so the
        // card's buttons drop out of the tab order and the a11y tree.
        ref={(el) => {
          cardRef.current = el;
          el?.setAttribute("inert", "");
        }}
      >
        {/* The card's rows are a subgrid of the Library's card grid; this
            grid gives them tracks, or the title track collapses under the
            first property line. */}
        <div className="grid">
          <EntityCard entity={entity} layout="cards" query="" selected={false} connections={3} onSelect={noop} onView={noop} />
        </div>
      </div>
    </section>
  );
}
