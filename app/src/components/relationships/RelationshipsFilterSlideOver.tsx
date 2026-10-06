import { useMemo } from "react";
import { useAtom } from "jotai";
import { useRelAtom, useScopedReferences } from "../../hooks/useEntityScope";
import {
  relTypeFiltersAtom,
  relEntityTypeFiltersAtom,
  relTargetCountryFiltersAtom,
  relTargetDescriptorFiltersAtom,
  relTargetDescriptorModeAtom,
  relInheritedFiltersAtom,
  relAnchoringFiltersAtom,
  relDirectionFiltersAtom,
  relVerificationFiltersAtom,
  relAsOfAtom,
} from "../../atoms/filters";
import {
  ANCHORING_LABEL,
  DIRECTION_LABEL,
  VERIFICATION_LABEL,
  anchoringOf,
  asOfSeconds,
  directionClassifier,
  refHoldsAt,
  type Anchoring,
  type DirectionFacet,
} from "../../utils/relationships";
import { DirectionGlyph } from "./DirectionGlyph";
import { languageAtom } from "../../atoms/language";
import { getEntity, getEntityType } from "../../data/entities";
import { getEntityProp } from "../../data/entityMetadata";
import { inheritedFilterProps } from "../../data/metadata";
import { thesaurusParentOf } from "../../utils/thesauri";
import { relationLabel } from "../../utils/inheritance";
import { entityCountries } from "../../utils/libraryFacets";
import { FILTER_RAIL, FilterCard, FilterListCard, SegmentRow } from "../shared/FilterCard";
import { DateInput } from "../shared/DateInput";
import { VerificationDot } from "./rows/RefStatus";
import { t } from "../../utils/i18n";

/**
 * Body-only facet sections for Relationships. Designed to be wrapped by
 * FiltersSlideOver chrome; it no longer renders a source summary or footer.
 *
 * Beyond relation type + target entity type, two scale-axis facets slice a
 * heavily-connected entity's connections by the *target* entity's country and
 * descriptors (mirrors the Library facets). They self-hide when no target
 * carries that data (e.g. the mock seed), so the mock surface is unchanged.
 */
/** A fixed-vocabulary facet's options, in vocabulary order: the values these
 *  references hold at all (`present`), plus any ticked one, at their live
 *  counts. Zero stays listed, so a tick in another facet changes numbers, not
 *  rows. */
function facetEntries(
  labels: Record<string, string>,
  counts: Map<string, number>,
  selected: Record<string, boolean>,
  present: Map<string, number>,
): [string, number][] {
  return Object.keys(labels)
    .filter((id) => present.has(id) || selected[id])
    .map((id) => [id, counts.get(id) ?? 0] as [string, number]);
}

/** A facet's options: every value the references hold, ordered by how many
 *  hold it (then by name), at their live counts; a ticked value they no longer
 *  hold goes last. The order never follows the live counts. */
function stableEntries(
  present: Map<string, number>,
  counts: Map<string, number>,
  selected: Record<string, boolean>,
): [string, number][] {
  const ids = [...present.keys()].sort((a, b) => present.get(b)! - present.get(a)! || a.localeCompare(b));
  for (const id of Object.keys(selected)) if (selected[id] && !present.has(id)) ids.push(id);
  return ids.map((id) => [id, counts.get(id) ?? 0]);
}

/** Each facet's values over every reference in scope, no facet applied: the
 *  rows the panel lists. Entity-derived facets count distinct targets. */
function facetUniverse(
  references: ReturnType<typeof useScopedReferences>,
  directionOf: (r: ReturnType<typeof useScopedReferences>[number]) => string,
  language: Parameters<typeof entityCountries>[1],
) {
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  const out = {
    rel: new Map<string, number>(),
    ent: new Map<string, number>(),
    country: new Map<string, number>(),
    descriptor: new Map<string, number>(),
    anchoring: new Map<string, number>(),
    direction: new Map<string, number>(),
    verification: new Map<string, number>(),
  };
  const seen = new Set<string>();
  for (const ref of references) {
    bump(out.rel, ref.relationType);
    bump(out.anchoring, anchoringOf(ref));
    bump(out.direction, directionOf(ref));
    if (ref.verification) bump(out.verification, ref.verification);
    const entity = getEntity(ref.targetEntityId);
    bump(out.ent, entity?.typeId ?? "unknown");
    if (!entity || seen.has(entity.id)) continue;
    seen.add(entity.id);
    for (const c of entityCountries(entity, language)) bump(out.country, c);
    for (const d of entity.descriptors ?? []) bump(out.descriptor, d);
  }
  return out;
}

export function RelationshipsFilterSlideOver() {
  const references = useScopedReferences();
  const [language] = useAtom(languageAtom);
  const [relTypeFilters, setRelTypeFilters] = useRelAtom(relTypeFiltersAtom);
  const [entityTypeFilters, setEntityTypeFilters] = useRelAtom(
    relEntityTypeFiltersAtom,
  );
  const [countryFilters, setCountryFilters] = useRelAtom(
    relTargetCountryFiltersAtom,
  );
  const [descriptorFilters, setDescriptorFilters] = useRelAtom(
    relTargetDescriptorFiltersAtom,
  );
  const [descriptorMode, setDescriptorMode] = useRelAtom(
    relTargetDescriptorModeAtom,
  );
  const [inheritedFilters, setInheritedFilters] = useRelAtom(
    relInheritedFiltersAtom,
  );
  const [anchoringFilters, setAnchoringFilters] = useRelAtom(relAnchoringFiltersAtom);
  const [directionFilters, setDirectionFilters] = useRelAtom(relDirectionFiltersAtom);
  const [verificationFilters, setVerificationFilters] = useRelAtom(relVerificationFiltersAtom);
  const [asOf, setAsOf] = useRelAtom(relAsOfAtom);
  // Against the unfiltered set, like the pipeline: see `directionClassifier`.
  const directionOf = useMemo(() => directionClassifier(references), [references]);
  const universe = useMemo(
    () => facetUniverse(references, directionOf, language),
    [references, directionOf, language],
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
  const { byRelType, byEntityType, byCountry, byDescriptor, byAnchoring, byDirection, byVerification } =
    useMemo(() => {
      const ids = (rec: Record<string, boolean>) =>
        new Set(Object.entries(rec).filter(([, v]) => v).map(([k]) => k));
      const selRel = ids(relTypeFilters);
      const selEnt = ids(entityTypeFilters);
      const selCty = ids(countryFilters);
      const selDsc = ids(descriptorFilters);
      const selAnc = ids(anchoringFilters);
      const selDir = ids(directionFilters);
      const selVer = ids(verificationFilters);
      const asOfAt = asOfSeconds(asOf);
      const ancOk = (r: (typeof references)[number]) =>
        selAnc.size === 0 || selAnc.has(anchoringOf(r));
      const dirOk = (r: (typeof references)[number]) =>
        selDir.size === 0 || selDir.has(directionOf(r));
      const verOk = (r: (typeof references)[number]) =>
        selVer.size === 0 || (!!r.verification && selVer.has(r.verification));
      // "As of" is not a facet with counts of its own: it narrows every count.
      const asOk = (r: (typeof references)[number]) => asOfAt === null || refHoldsAt(r, asOfAt);

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
      const anchoring = new Map<string, number>();
      const direction = new Map<string, number>();
      const verification = new Map<string, number>();
      for (const ref of references) {
        if (!asOk(ref)) continue;
        const entity = getEntity(ref.targetEntityId);
        const rest = relOk(ref) && entOk(ref) && ctyOk(ref) && dscOk(ref);
        if (rest && dirOk(ref) && verOk(ref)) {
          const a = anchoringOf(ref);
          anchoring.set(a, (anchoring.get(a) ?? 0) + 1);
        }
        if (rest && ancOk(ref) && verOk(ref)) {
          const d = directionOf(ref);
          direction.set(d, (direction.get(d) ?? 0) + 1);
        }
        if (rest && ancOk(ref) && dirOk(ref) && ref.verification) {
          verification.set(ref.verification, (verification.get(ref.verification) ?? 0) + 1);
        }
        // The reference-shape facets narrow every count below.
        if (!ancOk(ref) || !dirOk(ref) || !verOk(ref)) continue;
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
        // Descriptores in AND count the targets that already hold every ticked
        // descriptor, so a count is what ticking it returns.
        const dscAll =
          descriptorMode !== "AND" || [...selDsc].every((d) => entity?.descriptors?.includes(d));
        if (entity && dscAll && relOk(ref) && entOk(ref) && ctyOk(ref) && !seenD.has(entity.id)) {
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
      for (const id of selAnc) if (!anchoring.has(id)) anchoring.set(id, 0);
      for (const id of selDir) if (!direction.has(id)) direction.set(id, 0);
      for (const id of selVer) if (!verification.has(id)) verification.set(id, 0);
      return {
        byAnchoring: anchoring,
        byDirection: direction,
        byVerification: verification,
        byRelType: rel,
        byEntityType: ent,
        byCountry: country,
        byDescriptor: descriptor,
      };
    }, [
      references,
      language,
      relTypeFilters,
      entityTypeFilters,
      countryFilters,
      descriptorFilters,
      descriptorMode,
      anchoringFilters,
      directionFilters,
      verificationFilters,
      asOf,
      directionOf,
    ]);

  // Self-hiding, like the target facets: a facet whose every reference falls in
  // one value can't narrow anything (nearly every CEJIL entity is entity-level
  // only). Kept while something in it is ticked, so it stays clearable.
  const anchoringKinds = useMemo(() => new Set(references.map(anchoringOf)).size, [references]);
  const directionKinds = useMemo(
    () => new Set(references.map(directionOf)).size,
    [references, directionOf],
  );
  // Only where links carry a status or a period (Nepal); the Sample and CEJIL
  // record neither, so their panel is unchanged.
  const showVerification =
    useMemo(() => references.some((r) => r.verification), [references]) ||
    Object.values(verificationFilters).some(Boolean);
  const datedCount = useMemo(() => references.filter((r) => r.period).length, [references]);
  const showAsOf = datedCount > 0 || !!asOf;
  const showAnchoring = anchoringKinds > 1 || Object.values(anchoringFilters).some(Boolean);
  const showDirection = directionKinds > 1 || Object.values(directionFilters).some(Boolean);

  const countryEntries = useMemo(
    () => stableEntries(universe.country, byCountry, countryFilters),
    [universe, byCountry, countryFilters],
  );
  const descriptorEntries = useMemo(
    () => stableEntries(universe.descriptor, byDescriptor, descriptorFilters),
    [universe, byDescriptor, descriptorFilters],
  );

  // Drawn with the Library's filter parts (`shared/FilterCard.tsx`): paper
  // cards on a warm rail. Order: what a link is (verification, its day, its
  // anchoring and direction), then what it points to.
  return (
    <div data-component="RelationshipsFilters" className={`${FILTER_RAIL} min-h-full`}>
      {showVerification && (
        <FilterListCard
          title={t("System", "Verification")}
          entries={facetEntries(VERIFICATION_LABEL, byVerification, verificationFilters, universe.verification)}
          selected={verificationFilters}
          onToggle={(id) => setVerificationFilters((s) => ({ ...s, [id]: !s[id] }))}
          onClear={() => setVerificationFilters({})}
          label={(id) => VERIFICATION_LABEL[id as keyof typeof VERIFICATION_LABEL] ?? id}
          renderMarker={(id) => <VerificationDot status={id as keyof typeof VERIFICATION_LABEL} />}
        />
      )}
      {showAsOf && <AsOfCard value={asOf} onChange={setAsOf} dated={datedCount} />}
      {showAnchoring && (
        <FilterListCard
          title={t("System", "Anchoring")}
          entries={facetEntries(ANCHORING_LABEL, byAnchoring, anchoringFilters, universe.anchoring)}
          selected={anchoringFilters}
          onToggle={(id) => setAnchoringFilters((s) => ({ ...s, [id]: !s[id] }))}
          onClear={() => setAnchoringFilters({})}
          label={(id) => ANCHORING_LABEL[id as Anchoring] ?? id}
        />
      )}
      {showDirection && (
        <FilterListCard
          title={t("System", "Direction")}
          entries={facetEntries(DIRECTION_LABEL, byDirection, directionFilters, universe.direction)}
          selected={directionFilters}
          onToggle={(id) => setDirectionFilters((s) => ({ ...s, [id]: !s[id] }))}
          onClear={() => setDirectionFilters({})}
          label={(id) => DIRECTION_LABEL[id as DirectionFacet] ?? id}
          // The label already says the direction; the glyph names itself too.
          renderMarker={(id) => (
            <span aria-hidden className="inline-flex">
              <DirectionGlyph direction={id as DirectionFacet} />
            </span>
          )}
        />
      )}
      <FilterListCard
        title={t("System", "Relationship type")}
        entries={stableEntries(universe.rel, byRelType, relTypeFilters)}
        selected={relTypeFilters}
        onToggle={(id) => setRelTypeFilters((s) => ({ ...s, [id]: !s[id] }))}
        onClear={() => setRelTypeFilters({})}
        label={(id) => relationLabel(id)}
        noLabelId="no_label"
      />
      <FilterListCard
        title={t("System", "Target entity type")}
        entries={stableEntries(universe.ent, byEntityType, entityTypeFilters)}
        selected={entityTypeFilters}
        onToggle={(id) => setEntityTypeFilters((s) => ({ ...s, [id]: !s[id] }))}
        onClear={() => setEntityTypeFilters({})}
        label={(id) => getEntityType(id)?.name ?? id}
        noLabelId="unknown"
        renderMarker={(id) => {
          const type = getEntityType(id);
          return type ? (
            <span aria-hidden className="w-1.5 h-1.5 rounded-[2px] shrink-0" style={{ backgroundColor: type.color }} />
          ) : null;
        }}
      />
      {countryEntries.length > 0 && (
        <FilterListCard
          title={t("System", "Target country")}
          entries={countryEntries}
          selected={countryFilters}
          onToggle={(id) => setCountryFilters((s) => ({ ...s, [id]: !s[id] }))}
          onClear={() => setCountryFilters({})}
          searchable
        />
      )}
      {descriptorEntries.length > 0 && (
        <FilterListCard
          title={t("System", "Descriptores")}
          entries={descriptorEntries}
          selected={descriptorFilters}
          onToggle={(id) => setDescriptorFilters((s) => ({ ...s, [id]: !s[id] }))}
          onClear={() => {
            setDescriptorFilters({});
            setDescriptorMode("OR");
          }}
          narrowing={Object.values(descriptorFilters).some(Boolean) || descriptorMode !== "OR"}
          searchable
          // The Library's Match line, with the two modes this model has: a
          // target may hold several descriptors, so `all` is offered; `none`
          // and `missing` have no counterpart here.
          match={
            <SegmentRow
              component="FacetMatchRow"
              caption="Match"
              groupLabel={`Match mode for ${t("System", "Descriptores")}`}
              options={[
                { value: "OR", label: "any" },
                { value: "AND", label: "all" },
              ]}
              value={descriptorMode}
              onChange={setDescriptorMode}
            />
          }
        />
      )}
      {inheritedProps.map(({ propId, label }) => {
        const entries = Array.from(inheritedCounts[propId]?.entries() ?? []).sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
        );
        if (entries.length === 0) return null;
        return (
          <FilterListCard
            key={propId}
            title={label}
            entries={entries}
            selected={inheritedFilters[propId] ?? {}}
            onToggle={(value) =>
              setInheritedFilters((s) => ({
                ...s,
                [propId]: { ...(s[propId] ?? {}), [value]: !s[propId]?.[value] },
              }))
            }
            onClear={() => setInheritedFilters((s) => ({ ...s, [propId]: {} }))}
            // Inherited values come from thesauri (e.g. Region): nested child
            // values gather under their group as a non-selectable label.
            groupOf={thesaurusParentOf}
            searchable
          />
        );
      })}
    </div>
  );
}

/** "As of": one day. A link with a period (an office, a membership) shows only
 *  if it held that day; a link with no period is not time-bound and stays. Not
 *  a facet, so no checkbox rows: a date field in a card like the others. */
function AsOfCard({ value, onChange, dated }: { value: string; onChange: (iso: string) => void; dated: number }) {
  return (
    <FilterCard
      component="AsOfCard"
      title={t("System", "As of")}
      onClear={() => onChange("")}
      narrowing={!!value}
      stack
    >
      <div className="px-1 space-y-1.5">
        <DateInput
          value={value}
          onChange={onChange}
          aria-label="Show links that held on"
          className="w-full h-8 px-2 bg-warm border border-border rounded-md text-xs font-medium text-ink-secondary focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 transition-all"
        />
        <p className="px-1 text-meta text-ink-tertiary">
          {dated.toLocaleString()} dated {dated === 1 ? "link" : "links"} show only if they held that day. Undated links stay.
        </p>
      </div>
    </FilterCard>
  );
}
