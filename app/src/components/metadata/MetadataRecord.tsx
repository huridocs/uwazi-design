import { useAtomValue } from "jotai";
import type { Language } from "../../atoms/language";
import type { EntityProfile } from "../../data/entityProfiles";
import { entityMetadataAtom } from "../../atoms/entityMetadata";
import type { MetadataField, RelationshipMetadataField } from "../../data/metadata";
import { specInherits } from "../../utils/inheritance";
import { MetadataCard } from "./MetadataCard";
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
              className="align-top border-t border-border/40 first:border-t-0 hover:bg-warm/30 transition-colors"
            >
              <th
                scope="row"
                className="w-0 py-1.5 pr-6 text-start align-top font-medium text-[11px] uppercase tracking-wide text-ink-tertiary whitespace-nowrap"
              >
                {item.label}
              </th>
              <td className="py-1.5 align-top text-ink">{item.content}</td>
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

  if (longItems.length === 0 && shortItems.length === 0 && !hasRelCards) {
    return (
      <div className="flex items-center justify-center py-10 text-center">
        <p className="text-xs text-ink-muted">No metadata for this entity yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {longItems.map((item) => (
        <MetadataCard key={item.id} title={item.label}>
          {item.content}
        </MetadataCard>
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
