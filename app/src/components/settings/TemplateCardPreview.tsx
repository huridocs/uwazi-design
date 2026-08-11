import { useMemo } from "react";
import { EntityCard } from "../library/EntityCard";
import { registerPreviewType, type Entity } from "../../data/entities";
import { seedThesauri, seedThesaurusItems, type TemplateProperty } from "../../data/settings";

/** Fixed id for the ephemeral preview type — never collides with a real
 *  template id (see registerPreviewType's lookup order). */
const PREVIEW_TYPE_ID = "settings-template-preview";

/** Per-property config the TemplateEditor holds beside its property list; the
 *  preview only cares about `content` (which thesaurus feeds a select). */
interface PreviewPropConfig {
  content?: string;
}

const noop = () => {};

/** Calm, deterministic demo values by property type. Cycled by position so two
 *  text fields don't read identically. */
const TEXT_SAMPLES = ["Ref. 2026-014", "A short sample value", "San José, Costa Rica"];
const DATE_SAMPLES = ["12 May 2024", "3 Feb 2023", "28 Nov 2021"];

function firstThesaurusValue(name?: string): string | undefined {
  const thesaurus = seedThesauri.find((t) => t.name === name) ?? seedThesauri[0];
  return thesaurus ? seedThesaurusItems[thesaurus.id]?.[0] : undefined;
}

function demoValueFor(prop: TemplateProperty, cfg: PreviewPropConfig | undefined, index: number): string | null {
  switch (prop.type) {
    case "text":
      return TEXT_SAMPLES[index % TEXT_SAMPLES.length];
    case "date":
      return DATE_SAMPLES[index % DATE_SAMPLES.length];
    case "numeric":
      return "128";
    case "select":
      return firstThesaurusValue(cfg?.content) ?? "First option";
    case "markdown":
      return "A short descriptive paragraph about this entity.";
    case "geolocation":
      return "14.6349, -90.5069";
    // Relationships resolve to connected entities and images fill the preview
    // slot — neither has a plausible scalar here, so they stay off the card.
    case "relationship":
    case "image":
      return null;
  }
}

/** Live Library-card preview for the template being edited. Reuses the REAL
 *  `EntityCard` (not a lookalike) over a demo entity derived from the editor's
 *  local state — name → type pill, colour → dot, first fields → demo values.
 *
 *  It's a picture, not a control: the wrapper is `inert` + `aria-hidden` +
 *  `pointer-events-none`, so the card's internal buttons never reach mouse,
 *  keyboard, or AT. */
export function TemplateCardPreview({
  name,
  color,
  properties,
  config,
  className = "",
}: {
  name: string;
  color: string;
  properties: TemplateProperty[];
  /** Per-property type config, keyed by property id (selects → thesaurus). */
  config?: Record<string, PreviewPropConfig>;
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
        .map((p, i) => {
          const value = demoValueFor(p, config?.[p.id], i);
          return value ? { label: p.label, value } : null;
        })
        .filter((f): f is { label: string; value: string } => f !== null),
    };
  }, [name, color, properties, config]);

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-ink mb-1">Card preview</h3>
      <p className="text-xs text-ink-tertiary mb-3">How entities of this template appear in the Library.</p>
      <div
        aria-hidden="true"
        className="pointer-events-none select-none max-w-[16.5rem]"
        // React 18 has no `inert` prop; set the attribute directly so the
        // card's buttons drop out of the tab order and the a11y tree.
        ref={(el) => el?.setAttribute("inert", "")}
      >
        <EntityCard entity={entity} layout="cards" query="" selected={false} connections={3} onSelect={noop} onView={noop} />
      </div>
    </div>
  );
}
