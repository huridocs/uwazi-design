import { useAtom } from "jotai";
import {
  searchQueryAtom,
  sortOrderAtom,
  relTypeFiltersAtom,
  entityTypeFiltersAtom,
  relTargetCountryFiltersAtom,
  relTargetDescriptorFiltersAtom,
  relInheritedFiltersAtom,
  activeClusterRefIdsAtom,
} from "../../atoms/filters";
import { getEntityType } from "../../data/entities";
import { relationTypes } from "../../data/references";
import { ActiveFilterChip } from "../shared/ActiveFilterChip";

export function ActiveFilterChips() {
  const [search, setSearch] = useAtom(searchQueryAtom);
  const [sort, setSort] = useAtom(sortOrderAtom);
  const [relTypeFilters, setRelTypeFilters] = useAtom(relTypeFiltersAtom);
  const [entityTypeFilters, setEntityTypeFilters] = useAtom(entityTypeFiltersAtom);
  const [countryFilters, setCountryFilters] = useAtom(relTargetCountryFiltersAtom);
  const [descriptorFilters, setDescriptorFilters] = useAtom(relTargetDescriptorFiltersAtom);
  const [inheritedFilters, setInheritedFilters] = useAtom(relInheritedFiltersAtom);
  const [cluster, setCluster] = useAtom(activeClusterRefIdsAtom);

  const activeRelTypes = Object.entries(relTypeFilters).filter(([, v]) => v).map(([k]) => k);
  const activeEntityTypes = Object.entries(entityTypeFilters).filter(([, v]) => v).map(([k]) => k);
  const activeCountries = Object.entries(countryFilters).filter(([, v]) => v).map(([k]) => k);
  const activeDescriptors = Object.entries(descriptorFilters).filter(([, v]) => v).map(([k]) => k);
  const activeInherited = Object.entries(inheritedFilters).flatMap(([propId, vals]) =>
    Object.entries(vals).filter(([, v]) => v).map(([value]) => ({ propId, value })),
  );

  const dropKey = (id: string) => (s: Record<string, boolean>) => {
    const next = { ...s };
    delete next[id];
    return next;
  };

  const hasAny =
    !!search.trim() ||
    sort !== "none" ||
    activeRelTypes.length > 0 ||
    activeEntityTypes.length > 0 ||
    activeCountries.length > 0 ||
    activeDescriptors.length > 0 ||
    activeInherited.length > 0 ||
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
        const isNoLabel = id === "unknown";
        return (
          <ActiveFilterChip
            key={`ent-${id}`}
            label={isNoLabel ? "No label" : (t?.name ?? id)}
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
      {activeCountries.map((c) => (
        <ActiveFilterChip
          key={`country-${c}`}
          label={c}
          onRemove={() => setCountryFilters(dropKey(c))}
        />
      ))}
      {activeDescriptors.map((d) => (
        <ActiveFilterChip
          key={`descriptor-${d}`}
          label={d}
          onRemove={() => setDescriptorFilters(dropKey(d))}
        />
      ))}
      {activeInherited.map(({ propId, value }) => (
        <ActiveFilterChip
          key={`inh-${propId}-${value}`}
          label={value}
          onRemove={() =>
            setInheritedFilters((s) => ({
              ...s,
              [propId]: dropKey(value)(s[propId] ?? {}),
            }))
          }
        />
      ))}
      {cluster && (
        <ActiveFilterChip
          label="From selection"
          onRemove={() => setCluster(null)}
        />
      )}
    </>
  );
}
