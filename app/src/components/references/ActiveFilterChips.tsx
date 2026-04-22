import { useAtom } from "jotai";
import {
  searchQueryAtom,
  sortOrderAtom,
  relationshipTypeFiltersAtom,
  relationshipEntityTypeFiltersAtom,
  activeClusterRefIdsAtom,
} from "../../atoms/filters";
import { getEntityType } from "../../data/entities";
import { relationTypes } from "../../data/references";
import { ActiveFilterChip } from "../shared/ActiveFilterChip";

export function ActiveFilterChips() {
  const [search, setSearch] = useAtom(searchQueryAtom);
  const [sort, setSort] = useAtom(sortOrderAtom);
  const [relTypeFilters, setRelTypeFilters] = useAtom(relationshipTypeFiltersAtom);
  const [entityTypeFilters, setEntityTypeFilters] = useAtom(relationshipEntityTypeFiltersAtom);
  const [cluster, setCluster] = useAtom(activeClusterRefIdsAtom);

  const activeRelTypes = Object.entries(relTypeFilters).filter(([, v]) => v).map(([k]) => k);
  const activeEntityTypes = Object.entries(entityTypeFilters).filter(([, v]) => v).map(([k]) => k);

  const hasAny =
    !!search.trim() ||
    sort !== "none" ||
    activeRelTypes.length > 0 ||
    activeEntityTypes.length > 0 ||
    !!cluster;

  if (!hasAny) return null;

  return (
    <>
      {search.trim() && (
        <ActiveFilterChip
          label={`"${search}"`}
          onRemove={() => setSearch("")}
        />
      )}
      {sort !== "none" && (
        <ActiveFilterChip
          label={sort === "asc" ? "A → Z" : "Z → A"}
          onRemove={() => setSort("none")}
        />
      )}
      {activeRelTypes.map((id) => (
        <ActiveFilterChip
          key={`rel-${id}`}
          label={relationTypes.find((r) => r.id === id)?.label ?? id}
          onRemove={() =>
            setRelTypeFilters((s) => {
              const next = { ...s };
              delete next[id];
              return next;
            })
          }
        />
      ))}
      {activeEntityTypes.map((id) => {
        const t = getEntityType(id);
        return (
          <ActiveFilterChip
            key={`ent-${id}`}
            label={t?.name ?? id}
            color={t?.color}
            onRemove={() =>
              setEntityTypeFilters((s) => {
                const next = { ...s };
                delete next[id];
                return next;
              })
            }
          />
        );
      })}
      {cluster && (
        <ActiveFilterChip
          label="From selection"
          onRemove={() => setCluster(null)}
        />
      )}
    </>
  );
}
