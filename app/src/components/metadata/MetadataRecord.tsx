import { useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import type { Language } from "../../atoms/language";
import type { EntityProfile } from "../../data/entityProfiles";
import { entityMetadataAtom, makeEntityPropReader } from "../../atoms/entityMetadata";
import { fillTargetAtom, fillRequestAtom } from "../../atoms/fillTarget";
import { focusMetadataFieldAtom } from "../../atoms/library";
import type { RelationshipMetadataField } from "../../data/metadata";
import { MetadataCard } from "./MetadataCard";
import { ImageCard } from "./ImageCard";
import { ImageLightbox } from "../shared/ImageLightbox";
import { SectionLabel } from "../shared/SectionLabel";
import { imageFocusKey, type EntityImage } from "../../data/entities";
import { MasonryGrid, MasonryItem } from "./MasonryGrid";
import { RecordFooter } from "./RecordFooter";
import { ConnectionGroupCard } from "./ConnectionGroupCard";
import { RelationshipFieldCard } from "./RelationshipFieldCard";
import { fieldItem, connectionItem, type MetadataItem } from "./items";
import { deriveTemplateStructure } from "../../utils/templateStructure";
import { flashElement } from "../../utils/flash";
import { groupConnections, specInherits, type ConnectionGroup } from "../../utils/inheritance";

/** One entry of the record, in template order. A plain item is a value card or
 *  a link-only connection's pill card; a connection that carries a TABLE (an
 *  inheriting single, or a multi-inheritance group) keeps its own card. */
type RecordEntry =
  | { kind: "item"; item: MetadataItem }
  | { kind: "group"; group: ConnectionGroup; keys: string[] }
  | { kind: "table"; field: RelationshipMetadataField };

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
    <div
      data-field-key={item.id}
      /* Space-separated, matched with `~=`: a relationship field is grouped by
         relation TYPE here and addressed by template PROPERTY from a Library
         card, and one field can answer to several property names. */
      data-field-keys={item.keyAliases?.join(" ")}
    >
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
 *  connections included (a connection that carries a table keeps its table
 *  card, at its template position).
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
  const getProp = makeEntityPropReader(useAtomValue(entityMetadataAtom));

  // Deep-focus from the Results tab: when a field of THIS entity is requested,
  // scroll it into view and flash it (the shared `flash-highlight` keyframe),
  // then clear the request so it fires once. Matched by field KEY (`data-field-
  // key` = the non-localized `MetadataField.id`), so it survives translation.
  const focusField = useAtomValue(focusMetadataFieldAtom);
  const clearFocus = useSetAtom(focusMetadataFieldAtom);
  const rootRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<EntityImage | null>(null);
  useEffect(() => {
    if (!focusField || focusField.entityId !== profile.id) return;
    const k = CSS.escape(focusField.fieldKey);
    const el = rootRef.current?.querySelector<HTMLElement>(
      `[data-field-key="${k}"], [data-field-keys~="${k}"]`,
    );
    if (el) {
      /* SCROLL, AND KEEP SCROLLING WHILE THE RECORD IS STILL SETTLING.
         One `scrollIntoView` is not enough here and the reason is the masonry:
         `MasonryItem` gives every card `gridRowEnd: span 1` until its first
         measure, so at the moment this effect runs the whole record is still
         collapsing to its real heights — and an image card, whose box resolves
         from an aspect ratio against a column width, is the tallest thing that
         moves. The target got flashed at a position it then left, which read as
         "the scroll went nowhere".

         So the root is observed and the scroll re-issued while it changes, for
         a bounded window. Smooth all the way, so the repeats retarget an
         animation in flight rather than jumping. */
      const settle = () => el.scrollIntoView({ behavior: "smooth", block: "center" });
      settle();
      const ro = new ResizeObserver(settle);
      if (rootRef.current) ro.observe(rootRef.current);
      const stopSettling = setTimeout(() => ro.disconnect(), 700);

      // The flash ends itself; clearing the request below re-runs this effect,
      // so nothing that must outlive this commit can live in its cleanup.
      flashElement(el);
      clearFocus(null);
      return () => {
        clearTimeout(stopSettling);
        ro.disconnect();
      };
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

     One pass over every property in declared sequence, relationships included
     — there is no separate Relationships section. A scalar with a value becomes
     a value card, a link-only relationship a pill card, an inheriting one its
     table card, and a scalar with no value is skipped.

     A multi-inheritance group (several fields sharing one `connectionKey`) is
     ONE connection, so its table renders ONCE, at the template position of its
     FIRST member field; the later members are skipped where they are declared.
     Its card answers deep focus for every member's id and aliases. */
  const { fields } = deriveTemplateStructure(profile, language);
  const relFields = fields.filter(
    (f): f is RelationshipMetadataField => f.type === "relationship",
  );
  const { groups } = groupConnections(relFields, language, getProp);
  const groupByKey = new Map(groups.map((g) => [g.connectionKey, g]));
  const placedGroups = new Set<string>();
  const entries: RecordEntry[] = [];
  for (const f of fields) {
    if (f.type === "relationship") {
      const group = f.connectionKey ? groupByKey.get(f.connectionKey) : undefined;
      if (group) {
        if (placedGroups.has(group.connectionKey)) continue;
        placedGroups.add(group.connectionKey);
        const members = relFields.filter((m) => m.connectionKey === group.connectionKey);
        const keys = members.flatMap((m) => [m.id, ...(m.keyAliases ?? [])]);
        entries.push({ kind: "group", group, keys });
      } else if (specInherits(f)) {
        entries.push({ kind: "table", field: f });
      } else {
        entries.push({ kind: "item", item: connectionItem(f) });
      }
    } else if (f.value?.trim()) {
      entries.push({ kind: "item", item: fieldItem(f) });
    }
  }

  // The document and the picture left this view — metadata is metadata, and
  // Files owns the renditions — so a file- or image-bearing entity no longer has
  // anything of its own down here. Emptiness is now decided by the fields alone;
  // the old carve-out for `profile.files` / `profile.image` would just leave a
  // PDF-and-little-else entity staring at a blank pane.
  /* IMAGES an entity carries as PROPERTIES, one card each.
     Only when there is more than one: a single picture is what the Library card
     and the Files tab already show, and the record deliberately stopped leading
     with it. More than one is the case nothing else covers — the slot draws the
     first and the others were simply absent, so this is where they are. Each
     card is keyed on its property, which is the target of the filename link the
     Library card prints. */
  const images = profile.images ?? [];
  const hasImages = images.length > 1;

  const empty = entries.length === 0 && !hasImages;
  if (empty) {
    return (
      <div className="flex items-center justify-center py-10 text-center">
        <p className="text-xs text-ink-muted">No metadata for this entity yet.</p>
      </div>
    );
  }

  return (
    <>
    <MasonryGrid containerRef={rootRef}>
      {/* Template sequence. The only thing kind decides here is `wide`: prose
          takes two columns of three, because a paragraph set in a third of a
          wide pane is a column of six-word lines. Chips and scalars take one.
          Placement is sparse, so the empty half-row beside a wide card stays
          empty — see MasonryGrid on why `dense` is out.

          Connection TABLES span the full width: a connection table folds to one
          card per connected entity below 28.5rem of its own container (see
          tableBreakpoint.ts), and a masonry column is ~345px, so left in a
          column every table would fold on a record with room for three
          columns. Full width keeps the table while the record can carry one. */}
      {entries.map((entry) =>
        entry.kind === "item" ? (
          <MasonryItem key={entry.item.id} wide={entry.item.kind === "long"}>
            <MetadataFieldBlock item={entry.item} />
          </MasonryItem>
        ) : entry.kind === "group" ? (
          <MasonryItem key={`group:${entry.group.connectionKey}`} full>
            <div data-field-key={entry.group.connectionKey} data-field-keys={entry.keys.join(" ")}>
              <ConnectionGroupCard group={entry.group} />
            </div>
          </MasonryItem>
        ) : (
          <MasonryItem key={entry.field.id} full>
            <div data-field-key={entry.field.id} data-field-keys={entry.field.keyAliases?.join(" ")}>
              <RelationshipFieldCard field={entry.field} span="full" />
            </div>
          </MasonryItem>
        ),
      )}
      {hasImages && (
        <MasonryItem full>
          {/* The PROPERTY key lives on the section, so a property-level focus
              from anywhere else still lands here — at the heading, above the
              first picture, which is the honest answer to "where is this
              property". The cards below address one asset each. */}
          <div className="mt-2 flex items-center" data-field-key={images[0].fieldKey}>
            <SectionLabel as="h3" level="section">
              Images
            </SectionLabel>
          </div>
        </MasonryItem>
      )}
      {hasImages &&
        images.map((img, i) => (
          <MasonryItem key={`${img.url}-${i}`} wide>
            {/* ONE KEY PER ASSET. Sharing the property key across every image
                of a property meant `querySelector` stopped at the first card,
                so clicking the third filename on a Library card scrolled to the
                first image — and on a card whose thumbnail is image 1, the
                clicked link could never be the match. */}
            <div data-field-key={imageFocusKey(img)}>
              <ImageCard
                image={img}
                title={img.filename ?? `Image ${i + 1}`}
                onOpen={setLightbox}
              />
            </div>
          </MasonryItem>
        ))}
    </MasonryGrid>
    {/* Outside the grid on purpose — see RecordFooter. */}
    <RecordFooter entityId={profile.id} />
    <ImageLightbox image={lightbox} onClose={() => setLightbox(null)} />
    </>
  );
}
