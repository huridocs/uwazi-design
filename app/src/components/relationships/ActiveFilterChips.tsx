import { useRelAtom } from "../../hooks/useEntityScope";
import {
  relSearchQueryAtom,
  relSortOrderAtom,
  relTypeFiltersAtom,
  relEntityTypeFiltersAtom,
  relTargetCountryFiltersAtom,
  relTargetDescriptorFiltersAtom,
  relInheritedFiltersAtom,
  activeClusterRefIdsAtom,
  relAnchoringFiltersAtom,
  relDirectionFiltersAtom,
} from "../../atoms/filters";
import { ANCHORING_LABEL, DIRECTION_LABEL, type Anchoring, type DirectionFacet } from "../../utils/relationships";
import { getEntityType } from "../../data/entities";
import { relationLabel } from "../../utils/inheritance";
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
  const [search, setSearch] = useRelAtom(relSearchQueryAtom);
  const [sort, setSort] = useRelAtom(relSortOrderAtom);
  const [relTypeFilters, setRelTypeFilters] = useRelAtom(relTypeFiltersAtom);
  const [entityTypeFilters, setEntityTypeFilters] = useRelAtom(relEntityTypeFiltersAtom);
  const [countryFilters, setCountryFilters] = useRelAtom(relTargetCountryFiltersAtom);
  const [descriptorFilters, setDescriptorFilters] = useRelAtom(relTargetDescriptorFiltersAtom);
  const [inheritedFilters, setInheritedFilters] = useRelAtom(relInheritedFiltersAtom);
  const [cluster, setCluster] = useRelAtom(activeClusterRefIdsAtom);
  const [anchoringFilters, setAnchoringFilters] = useRelAtom(relAnchoringFiltersAtom);
  const [directionFilters, setDirectionFilters] = useRelAtom(relDirectionFiltersAtom);

  const activeRelTypes = Object.entries(relTypeFilters).filter(([, v]) => v).map(([k]) => k);
  const activeEntityTypes = Object.entries(entityTypeFilters).filter(([, v]) => v).map(([k]) => k);
  const activeCountries = Object.entries(countryFilters).filter(([, v]) => v).map(([k]) => k);
  const activeDescriptors = Object.entries(descriptorFilters).filter(([, v]) => v).map(([k]) => k);
  const activeAnchoring = Object.entries(anchoringFilters).filter(([, v]) => v).map(([k]) => k);
  const activeDirections = Object.entries(directionFilters).filter(([, v]) => v).map(([k]) => k);
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
    activeAnchoring.length > 0 ||
    activeDirections.length > 0 ||
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
          onRemove={() => setSort(null)}
        />
      )}
      {activeAnchoring.map((id) => (
        <ActiveFilterChip
          key={`anc-${id}`}
          label={ANCHORING_LABEL[id as Anchoring] ?? id}
          onRemove={() => setAnchoringFilters(dropKey(id))}
        />
      ))}
      {activeDirections.map((id) => (
        <ActiveFilterChip
          key={`dir-${id}`}
          label={DIRECTION_LABEL[id as DirectionFacet] ?? id}
          onRemove={() => setDirectionFilters(dropKey(id))}
        />
      ))}
      {activeRelTypes.map((id) => (
        <ActiveFilterChip
          key={`rel-${id}`}
          label={relationLabel(id)}
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
