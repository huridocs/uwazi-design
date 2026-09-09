import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import type { Language } from "../../atoms/language";
import type { EntityProfile } from "../../data/entityProfiles";
import { entityMetadataAtom } from "../../atoms/entityMetadata";
import { fillTargetAtom, fillRequestAtom } from "../../atoms/fillTarget";
import { focusMetadataFieldAtom } from "../../atoms/library";
import type { MetadataField, RelationshipMetadataField } from "../../data/metadata";
import { SectionLabel } from "../shared/SectionLabel";
import { RecordFooter } from "./RecordFooter";
import { RelationshipCards } from "./RelationshipCards";
import { fieldItem, connectionItem, type MetadataItem } from "./items";
import { deriveTemplateStructure } from "../../utils/templateStructure";

/** One field of the record, in the FILE DETAILS idiom: a label above its value,
 *  no card, no border, no fill of its own.
 *
 *  This branch is the other half of a deliberate A/B — main keeps the bordered
 *  `MetadataCard` per field, playground reads as one dense panel — so it is the
 *  file panel's own recipe, not an approximation of it: `text-meta font-medium
 *  uppercase tracking-wide text-ink-muted` over the value, which is what
 *  `FileDetailEditor`'s `Field` has always used. Copying the shape but not the
 *  type would make the comparison about something nobody chose.
 *
 *  `data-field-key` stays on the wrapper — deep-focus from Results scrolls to it
 *  and flashes it, and the flash now paints a label and its value rather than a
 *  card, which is the same field either way. */
function MetadataFieldRow({ item, className = "" }: { item: MetadataItem; className?: string }) {
  return (
    <div data-field-key={item.id} className={`space-y-1 min-w-0 ${className}`}>
      <span className="block text-meta font-medium text-ink-muted uppercase tracking-wide">
        {item.label}
      </span>
      <div className="text-sm text-ink">
        <FillableValue item={item} />
      </div>
    </div>
  );
}

/** A value cell, and — only while a metadata field is armed for click-to-fill,
 *  and only for a value a field could take — the button that fills it.
 *
 *  Outside the mode this is a read-only row, and turning every value into a
 *  button that does nothing would be a worse lie than not offering it. The
 *  `-m-1 p-1` keeps the hover well from moving the row: values sit at the same
 *  y armed or not. */
function FillableValue({ item }: { item: MetadataItem }) {
  const fillTarget = useAtomValue(fillTargetAtom);
  const sendFill = useSetAtom(fillRequestAtom);
  if (!fillTarget || !item.fillValue) return <>{item.content}</>;
  return (
    <button
      type="button"
      onClick={() => sendFill(item.fillValue!)}
      title={`Fill ${fillTarget.label} with this value`}
      className="w-full -m-1 p-1 rounded-md text-start hover:bg-parchment transition-colors
        cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
    >
      {item.content}
    </button>
  );
}

/** An entity's record: every field its own titled block, in template order,
 *  then the connections that carry a table of their own.
 *
 *  ONE component behind the drawer and the main Metadata view. They had drifted
 *  into three different treatments of the same data (a masonry of per-field cards,
 *  then a lattice, and the drawer's tables); now the surfaces are the same view at
 *  different widths, and a change to one is a change to both. */
export function MetadataRecord({
  profile,
  language,
}: {
  profile: EntityProfile;
  language: Language;
}) {
  // Subscribing here keeps the record live when a value is edited at source.
  useAtomValue(entityMetadataAtom);

  // Deep-focus from the Results tab: when a field of THIS entity is requested,
  // scroll it into view and flash it (the shared `flash-highlight` keyframe),
  // then clear the request so it fires once. Matched by field KEY (`data-field-
  // key` = the non-localized `MetadataField.id`), so it survives translation.
  const focusField = useAtomValue(focusMetadataFieldAtom);
  const clearFocus = useSetAtom(focusMetadataFieldAtom);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusField || focusField.entityId !== profile.id) return;
    const el = rootRef.current?.querySelector<HTMLElement>(
      `[data-field-key="${CSS.escape(focusField.fieldKey)}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("flash-highlight");
      const t = setTimeout(() => el.classList.remove("flash-highlight"), 1100);
      clearFocus(null);
      return () => clearTimeout(t);
    }
    clearFocus(null); // field not on this record — don't leave the request hanging
  }, [focusField, profile.id, clearFocus]);

  /* THE TEMPLATE DECIDES ORDER. `deriveTemplateStructure` is the same
     derivation the Template tab draws from, so the tab that describes an
     entity's shape and the record laid out in it cannot disagree.

     This replaces bucketing by field KIND, which was mine and was wrong: it
     put every short scalar first, so Description — the Body group's FIRST
     property — landed in the middle of the record, and the dates and names
     arrived in an order the template never declared. Kind still decides a
     card's SHAPE (how many columns it spans, chips vs prose; see MasonryItem
     and `fieldKind`), and now nothing else.

     One pass over the body in declared sequence: a scalar with a value becomes
     a value card, a link-only relationship becomes a pill card, and a field
     with neither is skipped. Inheriting relationships are the `inherited`
     group and render as the Relationships section below. */
  const { body, inherited } = deriveTemplateStructure(profile, language);
  const items: MetadataItem[] = [];
  for (const f of body) {
    if (f.type === "relationship") {
      if (!f.connectionKey) items.push(connectionItem(f));
    } else if (f.value?.trim()) {
      items.push(fieldItem(f));
    }
  }

  /* The Relationships section below carries the inheriting connections and the
     grouped ones — a connection with a `connectionKey` shares a table with its
     siblings, which is a section, not a property. */
  const hasRelCards =
    inherited.length > 0 ||
    body.some((f) => f.type === "relationship" && !!f.connectionKey);

  // The document and the picture left this view — metadata is metadata, and
  // Files owns the renditions — so a file- or image-bearing entity no longer has
  // anything of its own down here. Emptiness is now decided by the fields alone;
  // the old carve-out for `profile.files` / `profile.image` would just leave a
  // PDF-and-little-else entity staring at a blank pane.
  const empty = items.length === 0 && !hasRelCards;
  if (empty) {
    return (
      <div className="flex items-center justify-center py-10 text-center">
        <p className="text-xs text-ink-muted">No metadata for this entity yet.</p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="space-y-3">
      {/* ONE PANEL, not a stack of cards: the file details' warm band with a
          section label heading it, and the fields as a label-over-value grid
          inside. Two columns where there is room, one below — a container query
          on the panel, so the 390px drawer and the preview overlay get the
          single column without a second component.

          Template sequence is untouched (see above), and a plain grid places
          its children in order, so the sparse placement the masonry was doing
          by hand comes for free here — nothing is ever pulled forward to close
          a gap. */}
      <div className="rounded-md bg-warm p-4 space-y-3">
        <SectionLabel as="h4" level="section">
          Details
        </SectionLabel>
        <div className="@container">
          <div className="grid grid-cols-1 @[26rem]:grid-cols-2 gap-x-6 gap-y-3">
            {/* THE TWO SHAPES THIS IDIOM NEEDS. A 200-word Description in half
                a column is a ribbon of four-word lines, and a chip row in half
                a column is a vertical stack of pills — both are the case that
                breaks a label/value grid. Both take the FULL width instead,
                which keeps the idiom (label above value) and gives the value
                the measure it needs. A scalar is one cell, which is the whole
                point of the grid. The span rides the SAME element as
                `data-field-key`, so the deep-focus flash paints the field at
                the width it actually occupies. */}
            {items.map((item) => (
              <MetadataFieldRow
                key={item.id}
                item={item}
                className={item.kind === "scalar" ? "" : "@[26rem]:col-span-2"}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Unchanged, and last: the relationships band keeps its own heading and
          its bordered connection tables. Those carry a table, which is a
          structure — the thing this treatment removes borders from is a
          PROPERTY. */}
      <RelationshipCards profile={profile} language={language} span="full" inheritingOnly />

      <RecordFooter entityId={profile.id} />
    </div>
  );
}
