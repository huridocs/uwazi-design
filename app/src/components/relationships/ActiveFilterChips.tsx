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

interface ActiveFilterChipsProps {
  /** Drop the search chip. Set when these chips render INSIDE the search input
   *  (`SearchBar`'s `inlineSlot`): the input is already showing the query
   *  verbatim, one gap away, with its own × to clear it — so the chip was the
   *  same state drawn twice in the same box, offering two ways to undo one
   *  thing. Facet chips stay: those have no other representation there. */
  omitSearch?: boolean;
}

export function ActiveFilterChips({ omitSearch = false }: ActiveFilterChipsProps = {}) {
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

  // Only an EXPLICIT alphabetical sort is a chip. This read `sort !== "none"`
  // with a label of `sort === "asc" ? "A → Z" : "Z → A"`, so the DEFAULT
  // ("appearance") fell into the else branch and every panel opened advertising
  // a Z → A sort it wasn't doing.
  const sorted = sort === "asc" || sort === "desc";

  const showSearch = !omitSearch && !!search.trim();

  const hasAny =
    showSearch ||
    sorted ||
    activeRelTypes.length > 0 ||
    activeEntityTypes.length > 0 ||
    activeCountries.length > 0 ||
    activeDescriptors.length > 0 ||
    activeInherited.length > 0 ||
    !!cluster;

  if (!hasAny) return null;

  return (
    <>
      {showSearch && (
        <ActiveFilterChip
          label={`"${search}"`}
          onRemove={() => setSearch("")}
        />
      )}
      {sorted && (
        <ActiveFilterChip
          label={sort === "asc" ? "A → Z" : "Z → A"}
          onRemove={() => setSort("appearance")}
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
