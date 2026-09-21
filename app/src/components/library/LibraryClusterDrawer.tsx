import { useAtomValue, useSetAtom } from "jotai";
import { MapPin } from "lucide-react";
import { librarySelectedClusterAtom, selectIdsAtom } from "../../atoms/library";
import { EntityListDrawer } from "./EntityListDrawer";

/** The drawer list of entities located at a clicked map cluster — mirrors the
 *  relationships "cluster → list in the drawer" pattern. Closing returns the
 *  drawer to Filters; clicking a row opens its preview on top. A thin host of
 *  `EntityListDrawer`, which the selection drawer shares — so a cluster's rows
 *  are selectable, and "Select all N" adds the whole cluster. */
export function LibraryClusterDrawer({
  onSelect,
  query,
}: {
  onSelect: (id: string, e?: React.MouseEvent) => void;
  /** The host's deferred query, to mark. */
  query: string;
}) {
  const cluster = useAtomValue(librarySelectedClusterAtom);
  const setCluster = useSetAtom(librarySelectedClusterAtom);
  const selectIds = useSetAtom(selectIdsAtom);
  if (!cluster) return null;
  return (
    <EntityListDrawer
      icon={<MapPin size={15} />}
      title={cluster.label}
      ids={cluster.ids}
      onClose={() => setCluster(null)}
      closeLabel="Back to filters"
      onSelect={onSelect}
      query={query}
      headerAction={
        <button
          type="button"
          onClick={() => selectIds(cluster.ids)}
          className="px-2 h-6 text-meta font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
        >
          Select all {cluster.ids.length.toLocaleString()}
        </button>
      }
    />
  );
}
