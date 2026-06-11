import { useAtomValue, useSetAtom } from "jotai";
import { X, MapPin } from "lucide-react";
import { librarySelectedClusterAtom, librarySelectedEntityIdAtom } from "../../atoms/library";
import { openEntityAtom } from "../../atoms/focusedEntity";
import { getEntity, type Entity } from "../../data/entities";
import { EntityCard } from "./EntityCard";

/** The drawer list of entities located at a clicked map cluster — mirrors the
 *  relationships "cluster → list in the drawer" pattern. Closing returns the
 *  drawer to Filters; selecting a row opens its preview on top. */
export function LibraryClusterDrawer() {
  const cluster = useAtomValue(librarySelectedClusterAtom);
  const setCluster = useSetAtom(librarySelectedClusterAtom);
  const setSelectedId = useSetAtom(librarySelectedEntityIdAtom);
  const openEntity = useSetAtom(openEntityAtom);

  if (!cluster) return null;
  const ents = cluster.ids.map((id) => getEntity(id)).filter(Boolean) as Entity[];

  return (
    <div className="flex flex-col h-full min-h-0 bg-paper">
      <div
        className="shrink-0 flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        <MapPin size={15} className="text-ink-tertiary shrink-0" />
        <span className="text-sm font-semibold text-ink truncate">{cluster.label}</span>
        <span className="text-[11px] text-ink-tertiary">
          {ents.length} {ents.length === 1 ? "entity" : "entities"}
        </span>
        <button
          onClick={() => setCluster(null)}
          aria-label="Back to filters"
          className="ms-auto p-1.5 rounded-md hover:bg-warm text-ink-muted hover:text-ink transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 flex flex-col gap-2">
        {ents.map((e) => (
          <EntityCard
            key={e.id}
            entity={e}
            layout="list"
            selected={false}
            onSelect={() => setSelectedId(e.id)}
            onView={() => openEntity(e.id)}
          />
        ))}
      </div>
    </div>
  );
}
