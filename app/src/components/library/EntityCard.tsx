import { memo } from "react";
import { Link2 } from "lucide-react";
import { useAtomValue } from "jotai";
import { languageAtom } from "../../atoms/language";
import { EntityPill } from "../shared/EntityPill";
import { EntityThumbnail } from "./EntityThumbnail";
import { getEntityProfile } from "../../data/entityProfiles";
import type { MetadataField } from "../../data/metadata";
import type { Entity } from "../../data/entities";
import { libraryInfoAtom, type LibraryViewMode } from "../../atoms/library";

/** A Library result for one standalone entity. Mirrors the Uwazi card IA:
 *  title → metadata field label/value pairs → footer (template pill · View).
 *  Clicking the surface opens the entity in the drawer; "View" navigates in.
 *  Selected (previewed) = bg-parchment; no left-border accent. */
export const EntityCard = memo(function EntityCard({
  entity,
  layout,
  selected,
  connections = 0,
  onSelect,
  onView,
}: {
  entity: Entity;
  layout: LibraryViewMode;
  selected: boolean;
  connections?: number;
  onSelect: (id: string) => void;
  onView: (id: string) => void;
}) {
  const language = useAtomValue(languageAtom);
  const info = useAtomValue(libraryInfoAtom);
  const showPreview = info.preview !== false;
  const showMetadata = info.metadata !== false;
  const showConnections = info.connections !== false;

  const connectionBadge = showConnections && connections > 0 && (
    <span className="inline-flex items-center gap-1 text-[11px] text-ink-tertiary tabular-nums" title={`${connections} connections`}>
      <Link2 size={11} className="text-ink-muted" />
      {connections.toLocaleString()}
    </span>
  );

  // Adapter-supplied real fields (e.g. CEJIL) win; otherwise derive from the mock
  // entityMetadata profile. Only fields that resolved to a value.
  const scalarFields: { id: string; label: string; value: string }[] = entity.fields
    ? entity.fields.map((f, i) => ({ id: `${f.label}-${i}`, label: f.label, value: f.value }))
    : (getEntityProfile(entity.id).metadata[language] ?? [])
        .filter((f): f is MetadataField => f.type !== "relationship" && !!(f as MetadataField).value && (f as MetadataField).value !== "—")
        .slice(0, 3)
        .map((f) => ({ id: f.id, label: f.label, value: String(f.value) }));
  const fields = [...scalarFields, { id: "language", label: "Language", value: language }];

  const viewButton = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onView(entity.id);
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
        onClick={() => onSelect(entity.id)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(entity.id)}
        className={`${base} ${surface} w-full px-3 py-2.5 flex items-center gap-3`}
      >
        {showPreview && entity.preview && (
          <EntityThumbnail kind={entity.preview} className="w-9 h-9 rounded shrink-0 overflow-hidden" />
        )}
        <EntityPill typeId={entity.typeId} />
        <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">{entity.title}</span>
        {showMetadata && scalarFields[0] && (
          <span className="hidden md:block text-[11px] text-ink-tertiary truncate max-w-[14rem]">
            {scalarFields[0].label}: <span className="text-ink-secondary">{scalarFields[0].value}</span>
          </span>
        )}
        {connectionBadge}
        {viewButton}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(entity.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(entity.id)}
      className={`${base} ${surface} p-3 flex flex-col gap-2.5 h-full`}
    >
      {showPreview && entity.preview && (
        <EntityThumbnail
          kind={entity.preview}
          className="h-24 w-full shrink-0 rounded overflow-hidden border border-border/60"
        />
      )}
      <span className="text-sm font-semibold text-ink leading-snug line-clamp-2">{entity.title}</span>

      {showMetadata && (
        <div className="flex-1 space-y-1.5">
          {fields.map((f) => (
            <div key={f.id} className="min-w-0">
              <span className="block text-[10px] text-ink-tertiary leading-tight">{f.label}</span>
              <span className="block text-xs text-ink leading-snug line-clamp-1">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <EntityPill typeId={entity.typeId} />
        <div className="flex items-center gap-2">
          {connectionBadge}
          {viewButton}
        </div>
      </div>
    </div>
  );
});
