import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import type { Language } from "../../atoms/language";
import type { EntityProfile } from "../../data/entityProfiles";
import { entityMetadataAtom } from "../../atoms/entityMetadata";
import { focusMetadataFieldAtom } from "../../atoms/library";
import type { MetadataField, RelationshipMetadataField } from "../../data/metadata";
import { specInherits } from "../../utils/inheritance";
import { MetadataCard } from "./MetadataCard";
import { DocumentCard } from "./DocumentCard";
import { RelationshipCards } from "./RelationshipCards";
import { fieldItem, connectionItem, isLongField, type MetadataItem } from "./items";

/** Scalar rows as a ruled label|value table — the drawer's treatment, which is
 *  the one we keep: the label column is as narrow as its longest label, values
 *  line up in a single column, hairlines tie the rows together. */
export function MetadataItemsTable({ items }: { items: MetadataItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              data-field-key={item.id}
              className="border-t border-border/40 first:border-t-0 hover:bg-warm/30 transition-colors"
            >
              {/* Label and value sit on a SHARED BASELINE, not a shared top
                  edge. They're different sizes (11px caps vs 14px body), so
                  `align-top` lined up their line-BOXES and left the glyphs on
                  visibly different levels — obvious once a deep-focus flash
                  paints the row box. Baseline alignment survives the two cases
                  `align-top` + a compensating padding can't: a value that WRAPS
                  (a cell's baseline is its FIRST line box, so the label stays
                  level with line one) and a value that's a PILL rather than
                  text (an inline-flex pill's baseline is its inner text, so the
                  label reads level with the pill's label, not its box). */}
              <th
                scope="row"
                className="w-0 py-1.5 pr-6 text-start align-baseline font-medium text-[11px] uppercase tracking-wide text-ink-tertiary whitespace-nowrap"
              >
                {item.label}
              </th>
              {/* `w-full max-w-0` gives the value column a DEFINITE width to
                  resolve against. Without it the cell is auto-sized from its
                  content, so a pill's `max-w-full` had no basis to clamp to: the
                  pill took its natural width and long connection titles ran off
                  the drawer's edge, clipped mid-pill instead of truncating.
                  With a definite basis, multi-pill values wrap (ConnectionPills
                  is `flex flex-wrap`) and a single over-long pill ellipsises
                  inside itself, keeping its full text in the `title` tooltip. */}
              <td className="w-full max-w-0 py-1.5 align-baseline text-ink">{item.content}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** An entity's record: long-form fields as titled cards, every short field AND
 *  link-only connection in one ruled Details card, then the connections that
 *  actually carry a table.
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

  const longItems: MetadataItem[] = filled.filter(isLongField).map(fieldItem);
  const shortItems: MetadataItem[] = [
    ...filled.filter((f) => !isLongField(f)).map(fieldItem),
    ...linkOnly.map(connectionItem),
  ];

  const hasRelCards = relFields.some((f) => specInherits(f) || !!f.connectionKey);

  // Don't say "no metadata" when there's a document to show: the card below IS
  // metadata, and an entity that is a PDF and little else isn't empty.
  const empty = longItems.length === 0 && shortItems.length === 0 && !hasRelCards;
  if (empty && !(profile.files ?? []).length) {
    return (
      <div className="flex items-center justify-center py-10 text-center">
        <p className="text-xs text-ink-muted">No metadata for this entity yet.</p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="space-y-3">
      {/* The document leads: it's the thing the record is about. */}
      <DocumentCard profile={profile} language={language} />
      {longItems.map((item) => (
        <div key={item.id} data-field-key={item.id}>
          <MetadataCard title={item.label}>{item.content}</MetadataCard>
        </div>
      ))}
      {shortItems.length > 0 && (
        <MetadataCard title="Details">
          <MetadataItemsTable items={shortItems} />
        </MetadataCard>
      )}
      <RelationshipCards profile={profile} language={language} span="full" inheritingOnly />
    </div>
  );
}
