import type { ChainSegment } from "../../utils/chainTraversal";
import type { InheritReduce } from "../metadata";

/** A template is the schema an entity's form, record, cards, columns and
 *  filters render (template-schema-spec.md). One vocabulary for every corpus:
 *  Uwazi's own property types, by Uwazi's names. */
export type PropertyType =
  | "text"
  | "markdown"
  | "numeric"
  | "date"
  | "multidate"
  | "daterange"
  | "multidaterange"
  | "select"
  | "multiselect"
  | "relationship"
  | "link"
  | "image"
  | "preview"
  | "media"
  | "geolocation"
  | "generatedid"
  // CEJIL only, as in Uwazi (`settings.project === "cejil"`).
  | "nested";

export interface PropertyDef {
  /** Stable identity: Uwazi's `_id`, or `${templateId}:${name}` where the
   *  corpus has none. Never changes; Settings' rename detection and
   *  `inherit.property` point at it. */
  id: string;
  /** The key entity values are stored under, and `MetadataField.id`. Stable in
   *  the prototype: a rename changes the label only (decision S4). */
  name: string;
  /** English (decision S5); per-language labels are Translations' concern. */
  label: string;
  type: PropertyType;
  // Uwazi flags, false when absent.
  required?: boolean;
  noLabel?: boolean;
  showInCard?: boolean;
  filter?: boolean;
  defaultfilter?: boolean;
  prioritySorting?: boolean;
  fullWidth?: boolean;
  style?: "cover" | "contain";
  /** The title's "Generated ID" option. */
  generatedId?: boolean;
  /** select / multiselect: the thesaurus id. relationship: the target template
   *  id ("" = any template). */
  content?: string;
  /** relationship: the relationship type's registry id. */
  relationType?: string;
  /** relationship: the target template's property it inherits, by `id`. */
  inherit?: { property: string; type: PropertyType };
  nestedProperties?: string[];
  /** Prototype-only extensions, kept apart so the handoff can tell them from
   *  Uwazi fields. */
  x?: {
    inheritPath?: ChainSegment[];
    inheritLeaf?: string;
    reduce?: InheritReduce;
    connectionKey?: string;
    entityLabel?: string;
    /** `inherit.property` named an id the corpus cannot resolve. */
    inheritUnresolved?: boolean;
  };
  /** "prototype": a property Uwazi has no counterpart for (CEJIL's chain
   *  fields), so a handoff never passes it off as Uwazi's. */
  origin?: "uwazi" | "prototype";
}

export interface TemplateDef {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  /** title, creationDate, editDate: always present, in this order. */
  commonProperties: PropertyDef[];
  /** In order: the order of the form, the record, cards and the Template tab. */
  properties: PropertyDef[];
  entityViewPage?: string;
  /** The prototype's stand-in for `entityViewPage`: entities of this template
   *  open in the published view, with a toggle to the entity view. Seeded, not
   *  edited in Settings. `placement` is where the toggle sits (default
   *  "center"); both are kept so each can be shown. */
  publishedView?: { placement?: PublishedTogglePlacement };
}

/** Where the published-view toggle sits: "center" on the navbar's lower edge,
 *  "corner" at the content area's top inline-end corner. */
export type PublishedTogglePlacement = "center" | "corner";

/** The id rule for corpora whose properties carry no `_id` (Sample, CEJIL,
 *  Artworks): stable and unique, and the same everywhere. */
export const propertyIdOf = (templateId: string, name: string) => `${templateId}:${name}`;

/** Uwazi's common properties, for a template seed that lacks them. */
export function commonPropertiesFor(templateId: string, titleLabel = "Title"): PropertyDef[] {
  return [
    { id: propertyIdOf(templateId, "title"), name: "title", label: titleLabel, type: "text" },
    { id: propertyIdOf(templateId, "creationDate"), name: "creationDate", label: "Date added", type: "date" },
    { id: propertyIdOf(templateId, "editDate"), name: "editDate", label: "Date modified", type: "date" },
  ];
}

/** Every property of a template, common ones first. */
export const allProperties = (t: TemplateDef): PropertyDef[] => [...t.commonProperties, ...t.properties];
