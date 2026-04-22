import { useMemo } from "react";
import { useAtom } from "jotai";
import { referencesAtom } from "../../atoms/references";
import {
  relationshipTypeFiltersAtom,
  relationshipEntityTypeFiltersAtom,
} from "../../atoms/filters";
import { getEntity, getEntityType } from "../../data/entities";
import { relationTypes } from "../../data/references";
import { FacetSection } from "../shared/FacetSection";

/**
 * Body-only facet sections for Relationships. Designed to be wrapped by
 * FiltersDrawer chrome; it no longer renders a source summary or footer.
 */
export function RelationshipsFilterDrawer() {
  const [references] = useAtom(referencesAtom);
  const [relTypeFilters, setRelTypeFilters] = useAtom(relationshipTypeFiltersAtom);
  const [entityTypeFilters, setEntityTypeFilters] = useAtom(
    relationshipEntityTypeFiltersAtom,
  );

  const { byRelType, byEntityType, totalRels } = useMemo(() => {
    const rel = new Map<string, number>();
    const ent = new Map<string, number>();
    for (const ref of references) {
      rel.set(ref.relationType, (rel.get(ref.relationType) ?? 0) + 1);
      const entity = getEntity(ref.targetEntityId);
      const typeId = entity?.typeId ?? "unknown";
      ent.set(typeId, (ent.get(typeId) ?? 0) + 1);
    }
    return { byRelType: rel, byEntityType: ent, totalRels: references.length };
  }, [references]);

  return (
    <>
      <FacetSection
        title="Relation type"
        total={totalRels}
        entries={Array.from(byRelType.entries()).sort((a, b) => b[1] - a[1])}
        selected={relTypeFilters}
        onToggle={(id) => setRelTypeFilters((s) => ({ ...s, [id]: !s[id] }))}
        label={(id) => relationTypes.find((r) => r.id === id)?.label ?? id}
        defaultExpanded
      />
      <FacetSection
        title="Target entity type"
        total={totalRels}
        entries={Array.from(byEntityType.entries()).sort((a, b) => b[1] - a[1])}
        selected={entityTypeFilters}
        onToggle={(id) =>
          setEntityTypeFilters((s) => ({ ...s, [id]: !s[id] }))
        }
        label={(id) => getEntityType(id)?.name ?? id}
        renderMarker={(id) => {
          const t = getEntityType(id);
          return t ? (
            <span
              className="rounded-[2px] shrink-0"
              style={{
                backgroundColor: t.color,
                width: 6,
                height: 6,
              }}
            />
          ) : null;
        }}
      />
    </>
  );
}
