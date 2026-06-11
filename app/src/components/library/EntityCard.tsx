import { useAtomValue } from "jotai";
import { languageAtom } from "../../atoms/language";
import { EntityPill } from "../shared/EntityPill";
import { EntityThumbnail } from "./EntityThumbnail";
import { getEntityProfile } from "../../data/entityProfiles";
import type { MetadataField } from "../../data/metadata";
import type { Entity } from "../../data/entities";
import type { LibraryViewMode } from "../../atoms/library";

/** A Library result for one standalone entity. Mirrors the Uwazi card IA:
 *  title → metadata field label/value pairs → footer (template pill · View).
 *  Clicking the surface opens the entity in the drawer; "View" navigates in.
 *  Selected (previewed) = bg-parchment; no left-border accent. */
export function EntityCard({
  entity,
  layout,
  selected,
  onSelect,
  onView,
}: {
  entity: Entity;
  layout: LibraryViewMode;
  selected: boolean;
  onSelect: () => void;
  onView: () => void;
}) {
  const language = useAtomValue(languageAtom);
  const profile = getEntityProfile(entity.id);

  // A few metadata field label/value pairs (template properties), plus Language —
  // matching the Figma card. Only fields that resolved to a value.
  const scalarFields = (profile.metadata[language] ?? [])
    .filter((f): f is MetadataField => f.type !== "relationship" && !!(f as MetadataField).value && (f as MetadataField).value !== "—")
    .slice(0, 3);
  const fields = [...scalarFields, { id: "language", label: "Language", value: language } as MetadataField];

  const viewButton = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onView();
      }}
      className="shrink-0 inline-flex items-center px-2.5 h-6 text-[11px] font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
    >
      View
    </button>
  );

  const base =
    "group text-start rounded-md border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30";
  const surface = selected ? "bg-parchment border-border" : "bg-paper border-border/60 hover:bg-parchment";

  if (layout === "list") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
        className={`${base} ${surface} w-full px-3 py-2.5 flex items-center gap-3`}
      >
        {entity.preview && (
          <EntityThumbnail kind={entity.preview} className="w-9 h-9 rounded shrink-0 overflow-hidden" />
        )}
        <EntityPill typeId={entity.typeId} />
        <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">{entity.title}</span>
        {scalarFields[0] && (
          <span className="hidden md:block text-[11px] text-ink-tertiary truncate max-w-[14rem]">
            {scalarFields[0].label}: <span className="text-ink-secondary">{scalarFields[0].value}</span>
          </span>
        )}
        {viewButton}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      className={`${base} ${surface} p-3 flex flex-col gap-2.5 h-full`}
    >
      {entity.preview && (
        <EntityThumbnail
          kind={entity.preview}
          className="h-24 w-full shrink-0 rounded overflow-hidden border border-border/60"
        />
      )}
      <span className="text-sm font-semibold text-ink leading-snug line-clamp-2">{entity.title}</span>

      <div className="flex-1 space-y-1.5">
        {fields.map((f) => (
          <div key={f.id} className="min-w-0">
            <span className="block text-[10px] text-ink-tertiary leading-tight">{f.label}</span>
            <span className="block text-xs text-ink leading-snug line-clamp-1">{f.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <EntityPill typeId={entity.typeId} />
        {viewButton}
      </div>
    </div>
  );
}
