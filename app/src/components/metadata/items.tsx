import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { languageAtom } from "../../atoms/language";
import { entityMetadataAtom, makeEntityPropReader } from "../../atoms/entityMetadata";
import { EntityPill } from "../shared/EntityPill";
import { MediaFieldValue } from "./MediaFieldValue";
import { ThesaurusValueLabel } from "../shared/ThesaurusValueLabel";
import { countryFlag } from "../../utils/countryFlag";
import { safeHref } from "../../utils/typedValues";
import { formatDateText } from "../../utils/dateFormat";
import { resolveRelationshipField } from "../../utils/inheritance";
import type { MetadataField, RelationshipMetadataField } from "../../data/metadata";
import { previewEntityIdAtom } from "../../atoms/entityPreview";
import { ValueChips, TemplateDot, sharedTemplate, sortNatural, type ChipValue } from "./ValueChips";

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
  /** Extra keys this item answers to for deep focus — see
   *  `RelationshipMetadataField.keyAliases`. */
  keyAliases?: string[];
  /** The value as plain text, when there is one a metadata field could be
   *  filled with. While click-to-fill is armed the row's value becomes the
   *  button that answers it — the value a user is looking for is as often
   *  already recorded on a connected entity as it is buried in the document,
   *  and this record is where they read it. */
  fillValue?: string;
  /** Drawn before the label: a relationship field's template dot, when every
   *  record it holds shares one template. */
  icon?: ReactNode;
  /** The template property's display flags: Hide label, Full width. */
  noLabel?: boolean;
  fullWidth?: boolean;
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
  // A recording and its chapter list is a block of its own, like a paragraph.
  if (f.type === "multiline" || f.type === "media") return "long";
  // Several dates or date ranges are a list, one value per line (step M3:
  // a multidate is no longer one string).
  if ((f.displayValues?.length ?? 0) > 1) return "chips";
  if (f.items && f.items.length > 0) return "chips";
  if (f.type === "multiselect" && (f.values?.length ?? 0) > 1) return "chips";
  return (f.value?.length ?? 0) > LONG_CHARS ? "long" : "scalar";
}

export function isLongField(f: MetadataField): boolean {
  return fieldKind(f) === "long";
}

export function fieldItem(f: MetadataField, style?: "cover" | "contain"): MetadataItem {
  const kind = fieldKind(f);
  const long = kind === "long";
  // Dates print in the collection's format (Settings › Collection).
  const isDate = f.type === "date" || !!f.propertyType?.includes("date");
  return {
    id: f.id,
    label: f.label,
    kind,
    long,
    // Only short, plain values: a paragraph or a pill is not what a one-line
    // field is asking for.
    // A multiselect drawn as chips fills its whole set, in the order the
    // chips print: the armed field is a text box, and a row fills its field's
    // value, which for a multiselect is the set.
    fillValue:
      f.type === "multiselect" && kind === "chips"
        ? sortNatural(f.values!.map((v) => ({ text: v }))).map((v) => v.text).join(", ")
        : kind === "scalar" && f.type !== "link"
          ? f.value?.trim() || undefined
          : undefined,
    content:
      f.type === "multiselect" && kind === "chips" ? (
        <ValueChips
          label={f.label}
          values={f.values!.map((v) => ({ key: v, text: v, render: <ThesaurusValueLabel value={v} /> }))}
        />
      ) : (f.displayValues?.length ?? 0) > 1 ? (
        <ul data-part="value-list" className="space-y-0.5">
          {f.displayValues!.map((v, i) => (
            <li key={i} className="text-sm font-medium text-ink leading-relaxed tabular-nums">
              {isDate ? formatDateText(v) : v}
            </li>
          ))}
        </ul>
      ) : f.type === "media" ? (
        // The video's still behind the play button, as on its Library card.
        // Content warnings live on Nepal media items, which draw through
        // MediaItemCard and decide the still there.
        <MediaFieldValue raw={f.value} poster />
      ) : f.type === "country" ? (
        <span className="inline-flex items-center gap-1.5 text-sm text-ink leading-relaxed">
          <span className="leading-none">{f.flag}</span>
          <span className="font-medium">{f.value}</span>
        </span>
      ) : f.propertyType === "image" ? (
        // Fill covers the frame (cropping), Fit shows the whole picture.
        <img
          src={f.value}
          alt={f.label}
          className={`rounded-md border border-border-soft ${
            style === "cover" ? "w-full h-64 object-cover" : "max-w-full max-h-64 object-contain"
          }`}
        />
      ) : f.type === "link" ? (
        // `min-w-0` + `truncate`, for the same reason the pills next door carry
        // them: the value column has a definite width, and a URL is the one
        // value with no spaces to wrap at — a full Wikipedia link ran past the
        // drawer's edge and took the external-link icon with it.
        <span
          className="inline-flex items-center gap-1 max-w-full min-w-0 text-sm text-ink leading-relaxed"
          title={f.value}
        >
          {/* Uwazi's link is a label and a URL: the label shows, the URL opens. */}
          {safeHref(f.link?.url ?? f.value) ? (
            <>
              <a href={safeHref(f.link?.url ?? f.value)} target="_blank" rel="noreferrer" className="font-medium underline truncate">
                {f.link?.label || f.value}
              </a>
              <ExternalLink size={10} className="text-ink-muted shrink-0" />
            </>
          ) : (
            <span className="font-medium truncate">{f.link?.label || f.value}</span>
          )}
        </span>
      ) : isDate && !long ? (
        <span className="text-sm font-medium text-ink leading-relaxed tabular-nums">{formatDateText(f.value)}</span>
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
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink leading-relaxed">
          {/* A country is a select on the Countries thesaurus (decision S3);
              its flag comes from the label, as the old country field's did. */}
          {f.type === "select" && countryFlag(f.value) && <span className="leading-none">{countryFlag(f.value)}</span>}
          <ThesaurusValueLabel value={f.value} />
        </span>
      ),
  };
}

/** The records a link-only connection points at, as chips (`ValueChips`). */
function useConnectionValues(field: RelationshipMetadataField): ChipValue[] {
  const lang = useAtomValue(languageAtom);
  const getProp = makeEntityPropReader(useAtomValue(entityMetadataAtom));
  const setOverlay = useSetAtom(previewEntityIdAtom);
  const resolved = resolveRelationshipField(field, lang, getProp);
  return resolved.values.map((v) => ({
    key: v.entityId,
    text: v.entityTitle,
    typeId: v.entityTypeId,
    onOpen: () => setOverlay(v.entityId),
  }));
}

function ConnectionPills({ field }: { field: RelationshipMetadataField }) {
  const values = useConnectionValues(field);
  const more = field.totalConnected != null ? field.totalConnected - values.length : 0;
  return (
    <div data-component="ConnectionPills" className="contents">
      <ValueChips
        label={field.label}
        values={values}
        unit={values.length === 1 ? "record" : "records"}
        after={
          more > 0 ? (
            <span data-part="more" className="h-6 flex items-center text-meta text-ink-tertiary">
              +{more} more
            </span>
          ) : undefined
        }
      />
    </div>
  );
}

/** The template's dot by the label, when every connected record shares it. */
function ConnectionDot({ field }: { field: RelationshipMetadataField }) {
  const typeId = sharedTemplate(useConnectionValues(field));
  return typeId ? <TemplateDot typeId={typeId} /> : null;
}

/** A link-only connection as a record row.
 *
 *  It used to be a whole bordered card: a title, a caption reading "via Mecanismo
 *  · linked" under a heading already saying Mecanismo, and one pill. An entity
 *  with two dates and four links rendered as four near-empty boxes.
 *
 *  Connections that DO inherit keep their card — they carry a table (entities ×
 *  inherited columns), and provenance trails, which is real content. */
export function connectionItem(field: RelationshipMetadataField): MetadataItem {
  return {
    id: field.id,
    label: field.label,
    // A pill list is chips whatever its length: one connection or nine, the
    // value is a set of entities, and it wraps.
    kind: "chips",
    long: false,
    keyAliases: field.keyAliases,
    icon: <ConnectionDot field={field} />,
    content: <ConnectionPills field={field} />,
  };
}
