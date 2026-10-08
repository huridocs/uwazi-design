import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { ArrowDown, ArrowRight, ArrowUp, GripVertical, Plus, X } from "lucide-react";
import { dataSourceAtom, libraryEntitiesAtom, libraryTypesAtom } from "../../../atoms/dataSource";
import { languageAtom } from "../../../atoms/language";
import { libraryHasSyncAtom } from "../../../atoms/library";
import { networkGraphAtom } from "../../../atoms/network";
import { savedViewsAtom } from "../../../atoms/savedViews";
import {
  OVERVIEW_ACTION_IDS,
  OVERVIEW_MAX_ACTIONS,
  OVERVIEW_MAX_FACETS,
  OVERVIEW_MAX_FEATURED,
  type OverviewActionId,
  type OverviewConfig,
  type OverviewFeaturedMode,
  type OverviewHeroVisual,
  type OverviewSectionId,
} from "../../../atoms/overviewConfig";
import { getEntityType, type Entity } from "../../../data/entities";
import { entityContent } from "../../../utils/entityContent";
import { libraryInheritedDefs } from "../../../utils/libraryFacets";
import { timeExtent } from "../../../utils/timeline";
import type { ValidationIssue } from "../../../utils/validation";
import { overviewFactsText } from "../../library/LibraryOverview";
import { Checkbox } from "../../shared/Checkbox";
import { Modal, MODAL_BUTTON, MODAL_COMMIT } from "../../shared/Modal";
import { ModalList, ModalListRow, ModalSearchRow, ModalTypeDot } from "../../shared/ModalParts";
import { RadioGroup } from "../../shared/RadioGroup";
import { SegmentedControl } from "../../shared/SegmentedControl";
import { Select } from "../../shared/Select";
import { BAR_GHOST, BAR_LEAD } from "../../shared/warmButton";
import { SettingsField, TextInput } from "../SettingsField";
import { SettingsButton } from "../SettingsButton";

/* Settings › Collection › Overview: what a visitor lands on and what the
 * Library's Overview shows, edited on the Collection page's draft
 * (`CollectionFields.overview`). Every control writes the whole config
 * through `onChange`; the page saves it with the rest. */

const SECTION_META: Record<OverviewSectionId, { label: string; description: string }> = {
  contents: { label: "What's in it", description: "Records per template." },
  content: { label: "Content", description: "The documents, images and recordings the records carry, and their languages." },
  when: { label: "When", description: "Dated records over time." },
  where: { label: "Where", description: "Records with a location, on a map." },
  connections: { label: "How it connects", description: "Communities of linked records." },
  sync: { label: "Sync quality", description: "How closely the recordings agree on each moment's time." },
  values: { label: "Most used values", description: "The values the records share most often." },
  featured: { label: "Featured records", description: "A few records, shown as the Library's cards." },
};

const HERO_OPTIONS: { id: OverviewHeroVisual; label: string; help: string }[] = [
  { id: "auto", label: "Auto", help: "Chosen from what the collection holds: the Sync strip, the map where a fifth of the records have a location, else the time chart." },
  { id: "map", label: "Map", help: "The records with a location, across the page." },
  { id: "timeline", label: "Timeline", help: "The time chart of the largest templates, across the page." },
  { id: "network", label: "Network", help: "The communities of linked records, across the page." },
  { id: "none", label: "None", help: "No picture under the introduction; the sections follow it." },
];

const FEATURED_OPTIONS: { id: OverviewFeaturedMode; label: string; hint: string }[] = [
  { id: "connected", label: "Most connected", hint: "The records linked to the most others, at most two per template. Sources are left out." },
  { id: "recent", label: "Most recent", hint: "The records changed most recently." },
  { id: "cited", label: "Most cited", hint: "The records the most references point to." },
  { id: "manual", label: "Hand-picked", hint: `Up to ${OVERVIEW_MAX_FEATURED} records you choose, in your order.` },
];

const ACTION_LABEL: Record<OverviewActionId, string> = {
  browse: "Browse the collection",
  search: "Search",
  map: "Explore the map",
  network: "Open the network",
  timeline: "Open the timeline",
  sync: "Open the Sync view",
  savedView: "Open a saved view",
};

/** `list` with the item at `i` moved by `by` places. */
function moved<T>(list: T[], i: number, by: number): T[] {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  const [x] = out.splice(i, 1);
  out.splice(j, 0, x);
  return out;
}

const SMALL_ICON_BUTTON =
  "shrink-0 size-7 grid place-items-center rounded-md text-ink-tertiary hover:text-ink hover:bg-warm transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent";

export function OverviewSettings({
  value,
  onChange,
  landingPath,
  onLandingPath,
  landingIssue,
  landingInputId,
  landingHelp,
}: {
  value: OverviewConfig;
  onChange: (next: OverviewConfig) => void;
  /** The collection's `landing` path, the Custom page's address. */
  landingPath: string;
  onLandingPath: (path: string) => void;
  landingIssue: ValidationIssue | null;
  landingInputId: string;
  landingHelp: ReactNode;
}) {
  const source = useAtomValue(dataSourceAtom);
  const language = useAtomValue(languageAtom);
  const entities = useAtomValue(libraryEntitiesAtom);
  const hasSync = useAtomValue(libraryHasSyncAtom);
  const graph = useAtomValue(networkGraphAtom);
  const views = useAtomValue(savedViewsAtom);
  const set = (patch: Partial<OverviewConfig>) => onChange({ ...value, ...patch });

  // A lazy collection that has not loaded shows no records here; nothing is
  // then marked as having no data.
  const loaded = entities.length > 0;
  const placeholder = useMemo(() => overviewFactsText(entities, source), [entities, source]);

  /** The properties Most used values can show, in the Filters panel's order. */
  const facets = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    if (source === "cejil") out.push({ key: "descriptor", label: "Descriptores" });
    out.push({ key: "country", label: "Countries" });
    for (const def of libraryInheritedDefs(source, language)) out.push({ key: def.propId, label: def.label });
    return out;
  }, [source, language]);

  const hasData = useMemo((): Record<OverviewSectionId, boolean> => {
    let content = false;
    let located = false;
    for (const e of entities) {
      const c = entityContent(e, source);
      if ((c.contains?.length ?? 0) > 0 || (c.language?.length ?? 0) > 0) content = true;
      if (e.geo) located = true;
      if (content && located) break;
    }
    return {
      contents: entities.length > 0,
      content,
      when: !!timeExtent(entities),
      where: located,
      connections: graph.a.length > 0,
      sync: hasSync,
      values: facets.length > 0,
      featured: entities.length > 0,
    };
  }, [entities, source, graph, hasSync, facets]);

  const hero = HERO_OPTIONS.find((o) => o.id === value.heroVisual) ?? HERO_OPTIONS[0];
  const heroHelpId = useId();
  const introId = useId();

  return (
    <div data-component="OverviewSettings" className="flex flex-col gap-6">
      {/* ── Landing page ── */}
      <SettingsField label="Landing page" group description="What a visitor sees first when they come to the collection.">
        <RadioGroup
          name="overview-landing"
          ariaLabel="Landing page"
          value={value.landing}
          onChange={(id) => set({ landing: id as OverviewConfig["landing"] })}
          options={[
            { id: "overview", label: "Overview", hint: "The collection's landing page in the Library: what it holds, when, where, and how it connects." },
            { id: "library", label: "Library", hint: "The Library's records, in the default view." },
            { id: "page", label: "Custom page", hint: "A page, a filtered view, an entity or a document, by its address." },
          ]}
        />
      </SettingsField>
      {value.landing === "page" && (
        <SettingsField label="Custom page address" issue={landingIssue} description={landingHelp}>
          <TextInput
            id={landingInputId}
            addon="https://yourdomain"
            value={landingPath}
            issue={landingIssue}
            onChange={(e) => onLandingPath(e.target.value)}
          />
        </SettingsField>
      )}

      {/* ── Introduction ── */}
      <SettingsField
        label="Introduction"
        htmlFor={introId}
        description="The sentence under the collection's name and description. Leave it empty to use the one written from the records, shown here in grey."
      >
        <textarea
          id={introId}
          rows={3}
          value={value.intro}
          placeholder={placeholder || "Written from the records once the collection has loaded."}
          onChange={(e) => set({ intro: e.target.value })}
          className="w-full px-3 py-2 text-sm text-ink bg-warm border border-border rounded-md resize-y placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 transition-colors"
        />
      </SettingsField>

      {/* ── Hero visual ── */}
      <div data-component="SettingsField" className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-secondary">Hero visual</span>
        <div>
          <SegmentedControl
            ariaLabel="Hero visual"
            value={value.heroVisual}
            onChange={(id) => set({ heroVisual: id as OverviewHeroVisual })}
            options={HERO_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
          />
        </div>
        {/* One line's height for every choice, so the fields below never move. */}
        <p id={heroHelpId} className="min-h-10 text-xs text-ink-tertiary text-pretty">
          {hero.help}
        </p>
      </div>

      {/* ── Sections ── */}
      <SectionOrder
        sections={value.sections}
        hasData={loaded ? hasData : null}
        onChange={(sections) => set({ sections })}
      />

      {/* ── Most used values ── */}
      <FacetChoice
        facets={facets}
        chosen={value.valueFacets}
        onChange={(valueFacets) => set({ valueFacets })}
      />

      {/* ── Featured records ── */}
      <FeaturedChoice
        mode={value.featured.mode}
        ids={value.featured.ids}
        entities={entities}
        onChange={(featured) => set({ featured })}
      />

      {/* ── Primary actions ── */}
      <ActionChoice
        actions={value.actions}
        savedViewId={value.savedViewId}
        views={views.map((v) => ({ id: v.id, name: v.name }))}
        onChange={(patch) => set(patch)}
      />
    </div>
  );
}

/* ── Sections: a checklist reordered by drag or by the up/down buttons ── */

function SectionOrder({
  sections,
  hasData,
  onChange,
}: {
  sections: OverviewConfig["sections"];
  /** Null while the collection has not loaded. */
  hasData: Record<OverviewSectionId, boolean> | null;
  onChange: (next: OverviewConfig["sections"]) => void;
}) {
  const labelId = useId();
  const [announce, setAnnounce] = useState("");
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const grab = useRef(false);

  const move = (i: number, by: number, refocus: boolean) => {
    const next = moved(sections, i, by);
    if (next === sections) return;
    onChange(next);
    const id = sections[i].id;
    setAnnounce(`${SECTION_META[id].label} moved to position ${i + by + 1} of ${sections.length}.`);
    // Keep focus on the button that was pressed, at the row's new place; at
    // an end it moves to the other button, which is still enabled.
    if (refocus)
      requestAnimationFrame(() => {
        const row = document.querySelector<HTMLElement>(`[data-section-row="${id}"]`);
        const j = i + by;
        const want = by < 0 ? (j === 0 ? "down" : "up") : j === sections.length - 1 ? "up" : "down";
        row?.querySelector<HTMLButtonElement>(`[data-move="${want}"]`)?.focus();
      });
  };

  return (
    <div role="group" aria-labelledby={labelId} data-component="SettingsField" className="flex flex-col gap-1.5">
      <span id={labelId} className="text-xs font-medium text-ink-secondary">
        Sections
      </span>
      <p className="text-xs text-ink-tertiary text-pretty">
        Shown in this order, under the hero. Drag a row by its handle, or use its arrows. A section the collection has
        nothing for is left out of the Overview until it does.
      </p>
      <ol className="mt-1 flex flex-col gap-1.5">
        {sections.map((s, i) => {
          const meta = SECTION_META[s.id];
          const empty = hasData ? !hasData[s.id] : false;
          return (
            <li
              key={s.id}
              data-section-row={s.id}
              draggable={dragging === i}
              onDragStart={(e) => {
                if (!grab.current) return e.preventDefault();
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", s.id);
              }}
              onDragOver={(e) => {
                if (dragging === null) return;
                e.preventDefault();
                setOver(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging !== null && dragging !== i) move(dragging, i - dragging, false);
                setDragging(null);
                setOver(null);
              }}
              onDragEnd={() => {
                grab.current = false;
                setDragging(null);
                setOver(null);
              }}
              className={`flex items-center gap-2 rounded-lg border bg-paper ps-1 pe-1.5 py-1.5 transition-colors ${
                over === i && dragging !== null && dragging !== i ? "border-ink" : "border-border"
              } ${dragging === i ? "opacity-50" : ""}`}
            >
              <span
                aria-hidden
                title="Drag to reorder"
                onPointerDown={() => {
                  grab.current = true;
                  setDragging(i);
                }}
                onPointerUp={() => {
                  grab.current = false;
                  setDragging(null);
                }}
                className="shrink-0 size-7 grid place-items-center rounded-md text-ink-muted hover:text-ink-secondary cursor-grab active:cursor-grabbing"
              >
                <GripVertical size={14} />
              </span>
              <label className="min-w-0 flex-1 flex items-start gap-2.5 py-0.5 cursor-pointer">
                <span className="pt-0.5">
                  <Checkbox
                    checked={s.on}
                    ariaLabel={`Show ${meta.label}`}
                    onChange={(e) => onChange(sections.map((x) => (x.id === s.id ? { ...x, on: e.target.checked } : x)))}
                  />
                </span>
                <span className="min-w-0 flex flex-col">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium text-ink">{meta.label}</span>
                    {empty && <span className="text-xs text-ink-tertiary">No data in this collection</span>}
                  </span>
                  <span className="text-xs text-ink-tertiary text-pretty">{meta.description}</span>
                </span>
              </label>
              <button
                type="button"
                data-move="up"
                aria-label={`Move ${meta.label} up`}
                disabled={i === 0}
                onClick={() => move(i, -1, true)}
                className={SMALL_ICON_BUTTON}
              >
                <ArrowUp size={14} aria-hidden />
              </button>
              <button
                type="button"
                data-move="down"
                aria-label={`Move ${meta.label} down`}
                disabled={i === sections.length - 1}
                onClick={() => move(i, 1, true)}
                className={SMALL_ICON_BUTTON}
              >
                <ArrowDown size={14} aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
    </div>
  );
}

/* ── Most used values: up to three properties ── */

function FacetChoice({
  facets,
  chosen,
  onChange,
}: {
  facets: { key: string; label: string }[];
  chosen: string[];
  onChange: (next: string[]) => void;
}) {
  const labelId = useId();
  const full = chosen.length >= OVERVIEW_MAX_FACETS;
  return (
    <fieldset aria-labelledby={labelId} data-component="SettingsField" className="flex flex-col gap-1.5 min-w-0">
      <span id={labelId} className="text-xs font-medium text-ink-secondary">
        Most used values
      </span>
      <p className="text-xs text-ink-tertiary text-pretty">
        Up to {OVERVIEW_MAX_FACETS} properties, in the order you tick them.{" "}
        {chosen.length === 0
          ? "None ticked: the Overview shows the first three filters of Settings › Filters that hold two or more values."
          : `${chosen.length} of ${OVERVIEW_MAX_FACETS} ticked.`}
      </p>
      {facets.length === 0 ? (
        <p className="text-xs text-ink-tertiary">This collection has no filterable properties.</p>
      ) : (
        <div className="mt-1 grid grid-cols-1 @2xl:grid-cols-2 gap-1.5">
          {facets.map((f) => {
            const on = chosen.includes(f.key);
            const order = chosen.indexOf(f.key);
            return (
              <label
                key={f.key}
                className={`flex items-center gap-2.5 rounded-lg border border-border bg-paper px-3 py-2 ${
                  !on && full ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-warm"
                } transition-colors`}
              >
                <Checkbox
                  checked={on}
                  disabled={!on && full}
                  onChange={(e) => onChange(e.target.checked ? [...chosen, f.key] : chosen.filter((k) => k !== f.key))}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-ink" title={f.label}>
                  {f.label}
                </span>
                {/* The column's slot is always there, so ticking moves nothing. */}
                <span className="shrink-0 w-4 text-end text-xs text-ink-tertiary tabular-nums" aria-hidden>
                  {on ? order + 1 : ""}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

/* ── Featured records ── */

function FeaturedChoice({
  mode,
  ids,
  entities,
  onChange,
}: {
  mode: OverviewFeaturedMode;
  ids: string[];
  entities: Entity[];
  onChange: (next: OverviewConfig["featured"]) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [announce, setAnnounce] = useState("");
  const byId = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);
  return (
    <SettingsField label="Featured records" group>
      <RadioGroup
        name="overview-featured"
        ariaLabel="Featured records"
        value={mode}
        onChange={(id) => onChange({ mode: id as OverviewFeaturedMode, ids })}
        options={FEATURED_OPTIONS.map((o) => ({ id: o.id, label: o.label, hint: o.hint }))}
      />
      {mode === "manual" && (
        <div className="mt-2 flex flex-col gap-1.5">
          {ids.length > 0 && (
            <ol aria-label="Hand-picked records" className="flex flex-col gap-1.5">
              {ids.map((id, i) => {
                const e = byId.get(id);
                const title = e?.title ?? id;
                const type = e ? getEntityType(e.typeId) : undefined;
                return (
                  <li key={id} className="flex items-center gap-2 rounded-lg border border-border bg-paper ps-3 pe-1.5 py-1.5">
                    <span className="shrink-0 w-4 text-xs text-ink-tertiary tabular-nums">{i + 1}</span>
                    <ModalTypeDot color={type?.color} />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink" title={title}>
                      {title}
                    </span>
                    <button
                      type="button"
                      aria-label={`Move ${title} up`}
                      disabled={i === 0}
                      onClick={() => {
                        onChange({ mode, ids: moved(ids, i, -1) });
                        setAnnounce(`${title} moved to position ${i} of ${ids.length}.`);
                      }}
                      className={SMALL_ICON_BUTTON}
                    >
                      <ArrowUp size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${title} down`}
                      disabled={i === ids.length - 1}
                      onClick={() => {
                        onChange({ mode, ids: moved(ids, i, 1) });
                        setAnnounce(`${title} moved to position ${i + 2} of ${ids.length}.`);
                      }}
                      className={SMALL_ICON_BUTTON}
                    >
                      <ArrowDown size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${title}`}
                      onClick={() => onChange({ mode, ids: ids.filter((x) => x !== id) })}
                      className={SMALL_ICON_BUTTON}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          <div className="flex items-center gap-3">
            <SettingsButton
              variant="secondary"
              size="sm"
              icon={<Plus size={14} aria-hidden />}
              disabled={ids.length >= OVERVIEW_MAX_FEATURED}
              onClick={() => setPicking(true)}
            >
              Add records
            </SettingsButton>
            <span className="text-xs text-ink-tertiary tabular-nums">
              {ids.length} of {OVERVIEW_MAX_FEATURED}
            </span>
          </div>
          <p role="status" aria-live="polite" className="sr-only">
            {announce}
          </p>
        </div>
      )}
      {picking && (
        <RecordPicker
          entities={entities}
          chosen={ids}
          max={OVERVIEW_MAX_FEATURED}
          onClose={() => setPicking(false)}
          onDone={(next) => {
            onChange({ mode, ids: next });
            setPicking(false);
          }}
        />
      )}
    </SettingsField>
  );
}

/** Choose up to `max` records, by title: a search over the collection's
 *  records, ticked rows kept in the order they were ticked. */
function RecordPicker({
  entities,
  chosen,
  max,
  onClose,
  onDone,
}: {
  entities: Entity[];
  chosen: string[];
  max: number;
  onClose: () => void;
  onDone: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(chosen);
  const types = useAtomValue(libraryTypesAtom);
  const typeOf = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hits = needle ? entities.filter((e) => e.title.toLowerCase().includes(needle)) : entities;
    return hits.slice(0, 200);
  }, [entities, q]);
  const full = picked.length >= max;
  return (
    <Modal
      component="FeaturedRecordPicker"
      title="Add featured records"
      subtitle={`${picked.length} of ${max}`}
      size="md"
      height="34rem"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            Cancel
          </button>
          <button type="button" onClick={() => onDone(picked)} className={MODAL_COMMIT}>
            Done
          </button>
        </>
      }
    >
      <ModalSearchRow value={q} onChange={setQ} placeholder="Search records by title" ariaLabel="Search records by title" autoFocus />
      <ModalList aria-label="Records">
        {rows.length === 0 ? (
          <li className="py-6 text-center text-xs text-ink-tertiary">No record matches.</li>
        ) : (
          rows.map((e) => {
            const on = picked.includes(e.id);
            const type = typeOf.get(e.typeId) ?? getEntityType(e.typeId);
            return (
              <ModalListRow
                key={e.id}
                title={e.title}
                leading={<ModalTypeDot color={type?.color} />}
                meta={type?.name}
                pressed={on}
                selected={on}
                disabled={!on && full}
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== e.id) : [...p, e.id]))}
              />
            );
          })
        )}
      </ModalList>
    </Modal>
  );
}

/* ── Primary actions: up to three, in order ── */

function ActionChoice({
  actions,
  savedViewId,
  views,
  onChange,
}: {
  actions: OverviewActionId[];
  savedViewId: string;
  views: { id: string; name: string }[];
  onChange: (patch: Partial<OverviewConfig>) => void;
}) {
  const labelId = useId();
  const [announce, setAnnounce] = useState("");
  const rest = OVERVIEW_ACTION_IDS.filter((a) => !actions.includes(a));
  const full = actions.length >= OVERVIEW_MAX_ACTIONS;
  return (
    <div role="group" aria-labelledby={labelId} data-component="SettingsField" className="flex flex-col gap-1.5">
      <span id={labelId} className="text-xs font-medium text-ink-secondary">
        Primary actions
      </span>
      <p className="text-xs text-ink-tertiary text-pretty">
        Up to {OVERVIEW_MAX_ACTIONS} buttons under the introduction, in this order. The first is drawn solid.
      </p>
      <ol aria-label="Primary actions" className="mt-1 flex flex-col gap-1.5">
        {actions.map((a, i) => (
          <li key={a} className="flex items-center gap-2 rounded-lg border border-border bg-paper ps-3 pe-1.5 py-1.5">
            <span className="shrink-0 w-4 text-xs text-ink-tertiary tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{ACTION_LABEL[a]}</span>
            <button
              type="button"
              aria-label={`Move ${ACTION_LABEL[a]} up`}
              disabled={i === 0}
              onClick={() => {
                onChange({ actions: moved(actions, i, -1) });
                setAnnounce(`${ACTION_LABEL[a]} moved to position ${i} of ${actions.length}.`);
              }}
              className={SMALL_ICON_BUTTON}
            >
              <ArrowUp size={14} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={`Move ${ACTION_LABEL[a]} down`}
              disabled={i === actions.length - 1}
              onClick={() => {
                onChange({ actions: moved(actions, i, 1) });
                setAnnounce(`${ACTION_LABEL[a]} moved to position ${i + 2} of ${actions.length}.`);
              }}
              className={SMALL_ICON_BUTTON}
            >
              <ArrowDown size={14} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={`Remove ${ACTION_LABEL[a]}`}
              onClick={() => onChange({ actions: actions.filter((x) => x !== a) })}
              className={SMALL_ICON_BUTTON}
            >
              <X size={14} aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      {!full && rest.length > 0 && (
        <div className="w-full max-w-[18rem]">
          <Select
            value=""
            ariaLabel="Add an action"
            options={[{ value: "", label: "Add an action" }, ...rest.map((a) => ({ value: a, label: ACTION_LABEL[a] }))]}
            onChange={(v) => v && onChange({ actions: [...actions, v as OverviewActionId] })}
          />
        </div>
      )}
      {actions.includes("savedView") && (
        <div className="mt-2">
          <SettingsField label="Saved view to open">
            {views.length === 0 ? (
              <p className="text-xs text-ink-tertiary">
                This collection has no saved views yet. Save one in the Library; until then the button is not shown.
              </p>
            ) : (
              <div className="w-full max-w-[24rem]">
                <Select
                  id="overview-saved-view"
                  value={savedViewId}
                  ariaLabel="Saved view to open"
                  options={[{ value: "", label: "Choose a saved view" }, ...views.map((v) => ({ value: v.id, label: v.name }))]}
                  onChange={(v) => onChange({ savedViewId: v })}
                />
              </div>
            )}
          </SettingsField>
        </div>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
    </div>
  );
}

/** "Preview Overview →": the Library's Overview for this collection. */
export function PreviewOverviewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 h-7 px-2 -mx-2 rounded-md text-xs cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40 ${BAR_LEAD}`}
    >
      Preview Overview
      <ArrowRight size={12} aria-hidden className="rtl:-scale-x-100" />
    </button>
  );
}
