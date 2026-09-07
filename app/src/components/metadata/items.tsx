import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { languageAtom } from "../../atoms/language";
import { entityMetadataAtom, makeEntityPropReader } from "../../atoms/entityMetadata";
import { overlayEntityIdAtom } from "../../atoms/references";
import { EntityPill } from "../shared/EntityPill";
import { ThesaurusValueLabel } from "../shared/ThesaurusValueLabel";
import { resolveRelationshipField } from "../../utils/inheritance";
import type { MetadataField, RelationshipMetadataField } from "../../data/metadata";

/** One row of an entity's record: a label and whatever renders as its value.
 *
 *  Scalar properties and link-only connections are BOTH this — a connection that
 *  inherits nothing is just a property whose value happens to be an entity. Making
 *  them one type is what lets the drawer and the main view render one record
 *  instead of a table plus a stack of near-empty cards. */
export interface MetadataItem {
  id: string;
  label: string;
  content: ReactNode;
  /** What SHAPE this value is, which is what decides where it goes — not how
   *  tall it happens to render. See `fieldKind`. */
  kind: FieldKind;
  /** A paragraph: it gets its own titled card, not a value cell. */
  long: boolean;
  /** The value as plain text, when there is one a metadata field could be
   *  filled with. While click-to-fill is armed the row's value becomes the
   *  button that answers it — the value a user is looking for is as often
   *  already recorded on a connected entity as it is buried in the document,
   *  and this record is where they read it. */
  fillValue?: string;
}

/** The three shapes a record's values come in, and the whole basis of the
 *  layout. The masonry packed by HEIGHT, which is why the record read as
 *  scrambled: a twelve-line Description landed beside eight one-line cards and
 *  the eye had nothing to follow. Height is an accident of the value; kind is a
 *  fact about the field.
 *
 *  - `scalar` — a date, a number, a country, a short line of text. One of these
 *    alone is not worth a card: a bordered box, a heading and 40px of padding to
 *    carry the word "1988". They collect into ONE details card, as a dense
 *    label-over-value grid.
 *  - `long` — a paragraph. Its own card, and wide, because prose set in a third
 *    of a pane is a column of six-word lines.
 *  - `chips` — several values at once: a thesaurus multiselect, the entities a
 *    link-only connection points at. Its own card and ONE column, because chips
 *    wrap to fill whatever width they are given and a wide card of them is a
 *    paragraph of pills. */
export type FieldKind = "scalar" | "long" | "chips";

/** Where a short line stops being a line and becomes prose.
 *
 *  60, not the 100 this file used to carry. That number was chosen when the
 *  question was "does this deserve its own card" and the answer only had to be
 *  roughly right; now it decides whether a value goes in a grid CELL, and a
 *  70-character sentence in a cell sized for "Honduras" wraps to three lines and
 *  drags the whole row down with it. Measured against the corpora: the longest
 *  real scalar that still reads as one line is "Inter-American Commission on
 *  Human Rights" at 41. */
const LONG_CHARS = 60;

export function fieldKind(f: MetadataField): FieldKind {
  if (f.type === "multiline") return "long";
  if (f.items && f.items.length > 0) return "chips";
  return (f.value?.length ?? 0) > LONG_CHARS ? "long" : "scalar";
}

export function isLongField(f: MetadataField): boolean {
  return fieldKind(f) === "long";
}

export function fieldItem(f: MetadataField): MetadataItem {
  const kind = fieldKind(f);
  const long = kind === "long";
  return {
    id: f.id,
    label: f.label,
    kind,
    long,
    // Only short, plain values: a paragraph or a pill is not what a one-line
    // field is asking for.
    fillValue: !long && f.type !== "link" ? f.value?.trim() || undefined : undefined,
    content:
      f.type === "country" ? (
        <span className="inline-flex items-center gap-1.5 text-sm text-ink leading-relaxed">
          <span className="leading-none">{f.flag}</span>
          <span className="font-medium">{f.value}</span>
        </span>
      ) : f.type === "link" ? (
        // `min-w-0` + `truncate`, for the same reason the pills next door carry
        // them: the value column has a definite width, and a URL is the one
        // value with no spaces to wrap at — a full Wikipedia link ran past the
        // drawer's edge and took the external-link icon with it.
        <span
          className="inline-flex items-center gap-1 max-w-full min-w-0 text-sm text-ink leading-relaxed"
          title={f.value}
        >
          <span className="font-medium underline truncate">{f.value}</span>
          <ExternalLink size={10} className="text-ink-muted shrink-0" />
        </span>
      ) : long ? (
        <p className="text-sm text-ink leading-relaxed">{f.value}</p>
      ) : (
        // Thesaurus-backed child values carry their group as quiet context
        // ("Americas › Central America"); plain values render unchanged.
        //
        // `text-sm` is stated, not inherited. It used to be: every short value
        // rendered inside `<table className="w-full text-sm">`, so the cell
        // carried the size. The record left that table for a stack of cards and
        // the values kept no size of their own — they fell back to the document
        // default and printed at 16px, which is `text-base`, which TYPOGRAPHY.md
        // reserves for view titles. A field value is `text-sm font-medium
        // text-ink leading-relaxed`; nothing here may depend on its container to
        // say so.
        <span className="text-sm font-medium text-ink leading-relaxed">
          <ThesaurusValueLabel value={f.value} />
        </span>
      ),
  };
}

/** The entities a link-only connection points at, as pills. */
function ConnectionPills({ field }: { field: RelationshipMetadataField }) {
  const lang = useAtomValue(languageAtom);
  const getProp = makeEntityPropReader(useAtomValue(entityMetadataAtom));
  const setOverlay = useSetAtom(overlayEntityIdAtom);
  const resolved = resolveRelationshipField(field, lang, getProp);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {resolved.values.map((v) => (
        <button
          key={v.entityId}
          onClick={() => setOverlay(v.entityId)}
          className="min-w-0 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
          title="Preview source entity"
        >
          <EntityPill typeId={v.entityTypeId} label={v.entityTitle} />
        </button>
      ))}
      {field.totalConnected != null && field.totalConnected > resolved.values.length && (
        <span className="text-meta text-ink-tertiary">
          +{field.totalConnected - resolved.values.length} more
        </span>
      )}
    </div>
  );
}

/** A link-only connection as a record row.
 *
 *  It used to be a whole bordered card: a title, a caption reading "via Mecanismo
 *  · linked" under a heading already saying Mecanismo, and one pill. An entity
 *  with two dates and four links rendered as four near-empty boxes.
 *
 *  Connections that DO inherit keep their card — they carry a table (entities ×
 *  inherited columns), provenance trails and rollups, which is real content. */
export function connectionItem(field: RelationshipMetadataField): MetadataItem {
  return {
    id: field.id,
    label: field.label,
    // A pill list is chips whatever its length: one connection or nine, the
    // value is a set of entities, and it wraps.
    kind: "chips",
    long: false,
    content: <ConnectionPills field={field} />,
  };
}
