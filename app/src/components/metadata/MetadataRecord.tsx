import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import type { Language } from "../../atoms/language";
import type { EntityProfile } from "../../data/entityProfiles";
import { entityMetadataAtom } from "../../atoms/entityMetadata";
import { fillTargetAtom, fillRequestAtom } from "../../atoms/fillTarget";
import { focusMetadataFieldAtom } from "../../atoms/library";
import type { MetadataField, RelationshipMetadataField } from "../../data/metadata";
import { specInherits } from "../../utils/inheritance";
import { MetadataCard } from "./MetadataCard";
import { MasonryGrid, MasonryItem } from "./MasonryGrid";
import { RelationshipCards } from "./RelationshipCards";
import { fieldItem, connectionItem, isLongField, type MetadataItem } from "./items";

/** One field of the record, as its own card.
 *
 *  Every item gets this — a paragraph, a date, a link, a connection's pills —
 *  so the record is one stack of like things rather than a few titled cards
 *  above a ruled table of everything else.
 *
 *  The bordered `MetadataCard`, uniformly, in every host. A lighter
 *  label-value-hairline block shipped here first and was replaced on the user's
 *  call: the cost it avoids is real and worth naming, because it is what the
 *  drawer shows at 390px — a twelve-field entity is twelve boxes whose content
 *  is one short line each, and the card head is a 14px bold heading over the
 *  value it names. That is accepted. If it is ever revisited, the alternative
 *  is in the history (0aa1372), not a new idea to have.
 *
 *  `data-field-key` is on the card — what deep-focus from Results scrolls to
 *  and flashes, so the flash paints one field's title and value together. */
export function MetadataFieldBlock({ item }: { item: MetadataItem }) {
  return (
    <div data-field-key={item.id}>
      <MetadataCard title={item.label}>
        <FillableValue item={item} />
      </MetadataCard>
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

  const all = profile.metadata[language] ?? [];
  const scalar = all.filter((f): f is MetadataField => f.type !== "relationship");
  const relFields = all.filter(
    (f): f is RelationshipMetadataField => f.type === "relationship",
  );
  // Link-only, ungrouped connections are properties; grouped or inheriting ones
  // are sections with a table of their own.
  const linkOnly = relFields.filter((f) => !specInherits(f) && !f.connectionKey);
  const filled = scalar.filter((f) => !!f.value?.trim());

  /* ONE ordered stack. Long fields used to be hoisted above a "Details" card
     holding everything else, so a record was read in two passes — the
     paragraphs, then a table of the rest. The template's own order is the order
     the record should read in. */
  const items: MetadataItem[] = [...filled.map(fieldItem), ...linkOnly.map(connectionItem)];

  const hasRelCards = relFields.some((f) => specInherits(f) || !!f.connectionKey);

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
    /* The children stay in FIELD ORDER — the masonry packs them, it does not
       reorder them, so `data-field-key` deep-focus, the Tab order and a screen
       reader all still walk the record the way the template defines it. */
    <MasonryGrid containerRef={rootRef}>
      {items.map((item) => (
        <MasonryItem key={item.id}>
          <MetadataFieldBlock item={item} />
        </MasonryItem>
      ))}
      <RelationshipCards profile={profile} language={language} span="full" inheritingOnly />
    </MasonryGrid>
  );
}
