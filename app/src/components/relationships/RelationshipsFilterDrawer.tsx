import { useMemo } from "react";
import { useAtom } from "jotai";
import { scopedReferencesAtom } from "../../atoms/references";
import {
  relTypeFiltersAtom,
  entityTypeFiltersAtom,
  relTargetCountryFiltersAtom,
  relTargetDescriptorFiltersAtom,
  relTargetDescriptorModeAtom,
  relInheritedFiltersAtom,
} from "../../atoms/filters";
import { languageAtom } from "../../atoms/language";
import { getEntity, getEntityType } from "../../data/entities";
import { getEntityProp } from "../../data/entityMetadata";
import { inheritedFilterProps } from "../../data/metadata";
import { relationTypes } from "../../data/references";
import { entityCountries } from "../../utils/libraryFacets";
import { FacetSection } from "../shared/FacetSection";
import { t } from "../../utils/i18n";

/**
 * Body-only facet sections for Relationships. Designed to be wrapped by
 * FiltersDrawer chrome; it no longer renders a source summary or footer.
 *
 * Beyond relation type + target entity type, two scale-axis facets slice a
 * heavily-connected entity's connections by the *target* entity's country and
 * descriptors (mirrors the Library facets). They self-hide when no target
 * carries that data (e.g. the mock seed), so the mock surface is unchanged.
 */
export function RelationshipsFilterDrawer() {
  const [references] = useAtom(scopedReferencesAtom);
  const [language] = useAtom(languageAtom);
  const [relTypeFilters, setRelTypeFilters] = useAtom(relTypeFiltersAtom);
  const [entityTypeFilters, setEntityTypeFilters] = useAtom(
    entityTypeFiltersAtom,
  );
  const [countryFilters, setCountryFilters] = useAtom(
    relTargetCountryFiltersAtom,
  );
  const [descriptorFilters, setDescriptorFilters] = useAtom(
    relTargetDescriptorFiltersAtom,
  );
  const [descriptorMode, setDescriptorMode] = useAtom(
    relTargetDescriptorModeAtom,
  );
  const [inheritedFilters, setInheritedFilters] = useAtom(
    relInheritedFiltersAtom,
  );

  // The focal entity's inherited relationship properties (e.g. Role, Region) —
  // each becomes a dynamic facet of the value inherited from the connected
  // target (restricted to the field's target type). Country is already covered
  // by the Target-country facet, so it's excluded by the helper.
  const inheritedProps = useMemo(() => inheritedFilterProps(language), [language]);

  const inheritedCounts = useMemo(() => {
    const m: Record<string, Map<string, number>> = {};
    for (const { propId } of inheritedProps) m[propId] = new Map();
    const seen = new Set<string>();
    for (const ref of references) {
      const id = ref.targetEntityId;
      if (seen.has(id)) continue;
      seen.add(id);
      const typeId = getEntity(id)?.typeId;
      for (const { propId, targetTypeId } of inheritedProps) {
        if (typeId !== targetTypeId) continue;
        const v = getEntityProp(id, propId, language);
        if (v) m[propId].set(v, (m[propId].get(v) ?? 0) + 1);
      }
    }
    return m;
  }, [references, inheritedProps, language]);

  // Faceted counts: each facet's numbers reflect the OTHER active facets, so the
  // counts stay trustworthy as you narrow (a facet never counts against its own
  // selection, so its options don't vanish). Mirrors the Library's faceted counts.
  const { byRelType, byEntityType, byCountry, byDescriptor, totalRels } =
    useMemo(() => {
      const ids = (rec: Record<string, boolean>) =>
        new Set(Object.entries(rec).filter(([, v]) => v).map(([k]) => k));
      const selRel = ids(relTypeFilters);
      const selEnt = ids(entityTypeFilters);
      const selCty = ids(countryFilters);
      const selDsc = ids(descriptorFilters);

      const relOk = (r: (typeof references)[number]) =>
        selRel.size === 0 || selRel.has(r.relationType);
      const entOk = (r: (typeof references)[number]) => {
        if (selEnt.size === 0) return true;
        const e = getEntity(r.targetEntityId);
        return e ? selEnt.has(e.typeId) : selEnt.has("unknown");
      };
      const ctyOk = (r: (typeof references)[number]) => {
        if (selCty.size === 0) return true;
        const e = getEntity(r.targetEntityId);
        return e ? entityCountries(e, language).some((c) => selCty.has(c)) : false;
      };
      const dscOk = (r: (typeof references)[number]) => {
        if (selDsc.size === 0) return true;
        const ds = getEntity(r.targetEntityId)?.descriptors;
        if (!ds || ds.length === 0) return false;
        const have = new Set(ds);
        return descriptorMode === "AND"
          ? [...selDsc].every((d) => have.has(d))
          : [...selDsc].some((d) => have.has(d));
      };

      const rel = new Map<string, number>();
      const ent = new Map<string, number>();
      const country = new Map<string, number>();
      const descriptor = new Map<string, number>();
      const seenC = new Set<string>();
      const seenD = new Set<string>();
      for (const ref of references) {
        const entity = getEntity(ref.targetEntityId);
        // Per-facet: count over refs passing every OTHER facet.
        if (entOk(ref) && ctyOk(ref) && dscOk(ref))
          rel.set(ref.relationType, (rel.get(ref.relationType) ?? 0) + 1);
        if (relOk(ref) && ctyOk(ref) && dscOk(ref)) {
          const typeId = entity?.typeId ?? "unknown";
          ent.set(typeId, (ent.get(typeId) ?? 0) + 1);
        }
        // Entity-derived facets count distinct targets, not refs.
        if (entity && relOk(ref) && entOk(ref) && dscOk(ref) && !seenC.has(entity.id)) {
          seenC.add(entity.id);
          for (const c of entityCountries(entity, language))
            country.set(c, (country.get(c) ?? 0) + 1);
        }
        if (entity && relOk(ref) && entOk(ref) && ctyOk(ref) && !seenD.has(entity.id)) {
          seenD.add(entity.id);
          for (const d of entity.descriptors ?? [])
            descriptor.set(d, (descriptor.get(d) ?? 0) + 1);
        }
      }
      // A selected value can cross-filter to 0 under the other facets — keep it
      // in its own facet (at 0) so it stays visible and deselectable.
      for (const id of selRel) if (!rel.has(id)) rel.set(id, 0);
      for (const id of selEnt) if (!ent.has(id)) ent.set(id, 0);
      for (const id of selCty) if (!country.has(id)) country.set(id, 0);
      for (const id of selDsc) if (!descriptor.has(id)) descriptor.set(id, 0);
      return {
        byRelType: rel,
        byEntityType: ent,
        byCountry: country,
        byDescriptor: descriptor,
        totalRels: references.length,
      };
    }, [
      references,
      language,
      relTypeFilters,
      entityTypeFilters,
      countryFilters,
      descriptorFilters,
      descriptorMode,
    ]);

  const countryEntries = useMemo(
    () =>
      Array.from(byCountry.entries()).sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      ),
    [byCountry],
  );
  const descriptorEntries = useMemo(
    () =>
      Array.from(byDescriptor.entries()).sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      ),
    [byDescriptor],
  );
  const targetCount = useMemo(
    () => new Set(references.map((r) => r.targetEntityId)).size,
    [references],
  );

  return (
    <>
      <FacetSection
        title={t("System", "Relation type")}
        total={totalRels}
        entries={Array.from(byRelType.entries()).sort((a, b) => b[1] - a[1])}
        selected={relTypeFilters}
        onToggle={(id) => setRelTypeFilters((s) => ({ ...s, [id]: !s[id] }))}
        onClear={() => setRelTypeFilters({})}
        label={(id) => relationTypes.find((r) => r.id === id)?.label ?? id}
        noLabelId="no_label"
        defaultExpanded
      />
      <FacetSection
        title={t("System", "Target entity type")}
        total={totalRels}
        entries={Array.from(byEntityType.entries()).sort((a, b) => b[1] - a[1])}
        selected={entityTypeFilters}
        onToggle={(id) =>
          setEntityTypeFilters((s) => ({ ...s, [id]: !s[id] }))
        }
        onClear={() => setEntityTypeFilters({})}
        label={(id) => getEntityType(id)?.name ?? id}
        noLabelId="unknown"
        renderMarker={(id) => {
          const type = getEntityType(id);
          return type ? (
            <span
              className="rounded-[2px] shrink-0"
              style={{
                backgroundColor: type.color,
                width: 6,
                height: 6,
              }}
            />
          ) : null;
        }}
      />
      {countryEntries.length > 0 && (
        <FacetSection
          title={t("System", "Target country")}
          total={targetCount}
          entries={countryEntries}
          selected={countryFilters}
          onToggle={(id) =>
            setCountryFilters((s) => ({ ...s, [id]: !s[id] }))
          }
          onClear={() => setCountryFilters({})}
          label={(id) => id}
          searchable
          defaultExpanded={false}
        />
      )}
      {descriptorEntries.length > 0 && (
        <FacetSection
          title={t("System", "Descriptores")}
          total={targetCount}
          entries={descriptorEntries}
          selected={descriptorFilters}
          onToggle={(id) =>
            setDescriptorFilters((s) => ({ ...s, [id]: !s[id] }))
          }
          onClear={() => setDescriptorFilters({})}
          mode={descriptorMode}
          onModeChange={setDescriptorMode}
          label={(id) => id}
          searchable
          defaultExpanded={false}
        />
      )}
      {inheritedProps.map(({ propId, label }) => {
        const entries = Array.from(inheritedCounts[propId]?.entries() ?? []).sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
        );
        if (entries.length === 0) return null;
        const selected = inheritedFilters[propId] ?? {};
        return (
          <FacetSection
            key={propId}
            title={label}
            total={targetCount}
            entries={entries}
            selected={selected}
            onToggle={(value) =>
              setInheritedFilters((s) => ({
                ...s,
                [propId]: { ...(s[propId] ?? {}), [value]: !s[propId]?.[value] },
              }))
            }
            onClear={() =>
              setInheritedFilters((s) => ({ ...s, [propId]: {} }))
            }
            label={(value) => value}
            searchable
            defaultExpanded={false}
          />
        );
      })}
    </>
  );
}
