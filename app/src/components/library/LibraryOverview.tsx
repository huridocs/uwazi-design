import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ArrowRight, Bookmark, Pin } from "lucide-react";
import { dataSourceAtom, libraryEntitiesAtom, libraryTypesAtom, type DataSource } from "../../atoms/dataSource";
import { languageAtom, type Language } from "../../atoms/language";
import { collectionSettings } from "../../atoms/settingsSingletons";
import {
  libraryContentFiltersAtom,
  libraryCountryFiltersAtom,
  libraryDateFromAtom,
  libraryDateToAtom,
  libraryDescriptorFiltersAtom,
  libraryInheritedFiltersAtom,
  libraryMapBoundsAtom,
  libraryOpenEntityIdAtom,
  libraryOverviewOriginAtom,
  libraryTypeFiltersAtom,
  libraryViewModeAtom,
  networkCentreCommunityAtom,
  type LibraryViewMode,
} from "../../atoms/library";
import { networkGraphAtom } from "../../atoms/network";
import { canNameCommunity } from "../../data/network/graph";
import { notebookAtom } from "../../atoms/notebook";
import { applyLibrarySnapshotAtom, savedViewsAtom, snapshotFilterCount } from "../../atoms/savedViews";
import { templatesAtom } from "../../atoms/templates";
import { getEntity, getEntityType, type Entity, type EntityType } from "../../data/entities";
import { loadNetworkLayout, placeNetworkCached, type StoredLayout } from "../../data/network/layout";
import { CONTENT_ROWS, entityContent } from "../../utils/entityContent";
import { entityCountries, entityInheritedValues, libraryInheritedDefs } from "../../utils/libraryFacets";
import type { MapBounds } from "../../utils/libraryFilter";
import {
  bucketSeries,
  entityTime,
  formatDay,
  formatMoment,
  preciseTime,
  timeExtent,
  toBound,
  toISODate,
  type TimeBucket,
  type TimeUnit,
} from "../../utils/timeline";
import { typeLabelColor } from "../../utils/typeColor";
import { SectionLabel } from "../shared/SectionLabel";
import { ChartTip } from "./BucketBreakdown";
import { vegasSyncAtom } from "../../atoms/vegasSync";
import { formatClock } from "../../data/vegas/links";
import { ComparisonList, VegasSyncTable, momentName } from "./VegasSyncTable";

const OverviewMap = lazy(() => import("./OverviewMap"));

/* The Library's Overview: what the collection holds, on one page, and a way
 * into each part of it. Every chart is an entry point: a click applies the
 * filter it stands for and opens the view that shows it best
 * (`libraryOverviewOriginAtom` then brings the reader back here when they
 * clear it). It reads the whole collection, never the filters: the Overview
 * has none (`LibraryView` leaves it when one is set or a search starts).
 *
 * A section the collection has nothing for is left out. Cards size to their
 * content; where two columns meet, the last card in the shorter one takes the
 * slack (the map, when there is one). While a lazy corpus loads, the
 * skeleton has the loaded layout's parts in the same places. */

/** The map's least height; in the first band it takes what is left over. */
const MAP_MIN_H = "min-h-[15rem]";

/** Lanes the Overview's timeline draws; the Timeline view draws every one. */
const LANES = 6;
const LANE_H = 24;
const LANE_COL_MIN = 12;
const LANE_YEAR_MIN = 6;
const LANE_LABEL_PITCH = 40;
/** Templates, facet values and communities listed per card. */
const TOP_TEMPLATES = 8;
const TOP_VALUES = 6;
const TOP_COMMUNITIES = 4;
/** "Other" is listed as a content language only from this share up. */
const OTHER_LANGUAGE_MIN = 0.05;
const RECENT = 5;
/** The map is drawn when this share of the records, or this many, are located. */
const MAP_SHARE = 0.1;
const MAP_MIN = 50;

/** The lanes draw the window holding this share of the dated records when it
 *  is under this share of the whole span. */
const FOCUS_SHARE = 0.7;
const FOCUS_RATIO = 0.25;
const UNIT_MS: Record<TimeUnit, number> = {
  second: 1000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  month: 30.44 * 86_400_000,
  quarter: 91.3 * 86_400_000,
  year: 365.25 * 86_400_000,
  decade: 3652.5 * 86_400_000,
};
const TICK_STEPS: Record<TimeUnit, number[]> = {
  second: [1, 5, 10, 15, 30],
  minute: [1, 2, 5, 10, 15, 30],
  hour: [1, 2, 3, 6, 12],
  day: [1, 2, 7, 14],
  month: [1, 2, 3, 6, 12],
  quarter: [1, 2, 4],
  year: [1, 2, 5, 10, 20, 50],
  decade: [1, 2, 5],
};
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86_400_000;
const n = (v: number) => v.toLocaleString();
const plural = (v: number, one: string, many = `${one}s`) => `${n(v)} ${v === 1 ? one : many}`;
/** Rounded down, so 99.4% never reads as all of them. */
const pct = (part: number, whole: number) => `${whole ? Math.floor((part / whole) * 100) : 0}%`;

export function LibraryOverview({ loading }: { loading: boolean }) {
  const entities = useAtomValue(libraryEntitiesAtom);
  const source = useAtomValue(dataSourceAtom);
  const language = useAtomValue(languageAtom);
  const types = useAtomValue(libraryTypesAtom);
  const settings = useAtomValue(collectionSettings.valueAtom);
  const ready = !loading;

  /* ── Entry points ─────────────────────────────────────────────────── */
  const setView = useSetAtom(libraryViewModeAtom);
  const setOrigin = useSetAtom(libraryOverviewOriginAtom);
  const setTypes = useSetAtom(libraryTypeFiltersAtom);
  const setFrom = useSetAtom(libraryDateFromAtom);
  const setTo = useSetAtom(libraryDateToAtom);
  const setContent = useSetAtom(libraryContentFiltersAtom);
  const setCountries = useSetAtom(libraryCountryFiltersAtom);
  const setDescriptors = useSetAtom(libraryDescriptorFiltersAtom);
  const setInherited = useSetAtom(libraryInheritedFiltersAtom);
  const setMapBounds = useSetAtom(libraryMapBoundsAtom);
  const setOpen = useSetAtom(libraryOpenEntityIdAtom);
  const setCentre = useSetAtom(networkCentreCommunityAtom);
  const applySnapshot = useSetAtom(applyLibrarySnapshotAtom);
  /** Apply a filter, then open `view`; clearing that filter comes back here. */
  const enter = useCallback(
    (view: LibraryViewMode, apply: () => void) => {
      apply();
      setOrigin(true);
      setView(view);
    },
    [setOrigin, setView],
  );
  const openRecord = useCallback(
    (id: string) => {
      setView("cards");
      setOpen(id);
    },
    [setView, setOpen],
  );

  /* ── What the collection holds ─────────────────────────────────────── */
  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);
  const typeOf = useCallback(
    (id: string): EntityType => typeById.get(id) ?? getEntityType(id) ?? { id, name: id, color: "#6B7280" },
    [typeById],
  );

  // One pass for the counts the header, the template list and the Content
  // card read. Per collection, never per keystroke: the Overview has no query.
  const summary = useMemo(() => {
    const byType = new Map<string, number>();
    const contains = new Map<string, number>();
    const languages = new Map<string, number>();
    let quoted = 0;
    let located = 0;
    for (const e of entities) {
      byType.set(e.typeId, (byType.get(e.typeId) ?? 0) + 1);
      const c = entityContent(e, source);
      for (const k of c.contains ?? []) contains.set(k, (contains.get(k) ?? 0) + 1);
      for (const k of c.language ?? []) languages.set(k, (languages.get(k) ?? 0) + 1);
      if (c.quotes?.includes("has")) quoted++;
      if (e.geo) located++;
    }
    return {
      byType: [...byType.entries()].sort((a, b) => b[1] - a[1]),
      contains,
      languages: [...languages.entries()]
        .filter(([l, c]) => l !== "Other" || c / Math.max(1, entities.length) >= OTHER_LANGUAGE_MIN)
        .sort((a, b) => b[1] - a[1]),
      quoted,
      located,
      extent: timeExtent(entities),
    };
  }, [entities, source]);

  const recent = useMemo(
    () =>
      entities
        .filter((e) => e.updatedAt)
        .sort((a, b) => b.updatedAt!.localeCompare(a.updatedAt!))
        .slice(0, RECENT),
    [entities],
  );

  const facets = useFacetSummaries(entities, source, language, ready);
  const vegasSync = useAtomValue(vegasSyncAtom);
  const sync = source === "vegas" ? vegasSync : null;
  const [syncTableOpen, setSyncTableOpen] = useState(false);
  const network = useNetworkSummary(source, ready);

  const total = entities.length;
  const showMap = ready && summary.located > 0 && (summary.located >= MAP_MIN || summary.located / total >= MAP_SHARE);
  const showNetwork = ready && !!network && network.communities.length > 0;
  const contentRows = [
    ...CONTENT_ROWS.contains
      .map((r) => ({ id: r.id, label: r.label, count: summary.contains.get(r.id) ?? 0, group: "contains" as const }))
      .filter((r) => r.count > 0),
    ...(summary.quoted > 0 ? [{ id: "has", label: "Quoted passages", count: summary.quoted, group: "quotes" as const }] : []),
  ];
  const showContains = ready && contentRows.length > 0;
  const showLanguages = ready && summary.languages.length > 0;
  const showContent = showContains || showLanguages;
  const showLanes = !ready || !!summary.extent;
  const notebook = useAtomValue(notebookAtom);
  const views = useAtomValue(savedViewsAtom);
  const pins = notebook.pins.map((p) => getEntity(p.id)).filter((e): e is Entity => !!e);
  const showYours = ready && (views.length > 0 || pins.length > 0);
  const showRecent = ready && recent.length > 0;

  const located = useMemo(() => entities.filter((e) => e.geo), [entities]);
  const [scaleNote, setScaleNote] = useState<string | null>(null);
  const fullSpan = summary.extent ? formatSpan(summary.extent.min, summary.extent.max) : null;
  // Where the time section draws a concentrated window, the Dates figure
  // names that window; the whole span stays in its tooltip.
  const datesFocus = useMemo(
    () => (summary.extent ? focusWindow(entities.filter((e) => entityTime(e) !== null), summary.extent) : null),
    [entities, summary.extent],
  );
  const span = datesFocus ? formatWindow(datesFocus.min, datesFocus.max) : fullSpan;
  const mapCard = showMap && (
    <Section
      title="Where"
      // Takes what the column leaves, never less than its own minimum, so the
      // fitted map is whole in the card.
      className={`flex-1 ${MAP_MIN_H}`}
      action={{ label: "Open Map", onClick: () => setView("map") }}
      note={`${plural(summary.located, "record")} with a location`}
    >
      <div className="relative flex-1 min-h-0 rounded-md overflow-hidden bg-vellum">
        <Suspense fallback={null}>
          <OverviewMap
            located={located}
            onMap={() => setView("map")}
            onRecord={(id) => {
              setView("map");
              setOpen(id);
            }}
            onArea={(b: MapBounds) =>
              enter("map", () => {
                // The area is a filter only while the map is in front:
                // the view first, then the area.
                setView("map");
                setMapBounds(b);
              })
            }
          />
        </Suspense>
      </div>
    </Section>
  );
  const templatesCard = (
    <Section
      title="What's in it"
      note={ready ? plural(summary.byType.length, "template") : undefined}
      action={ready ? { label: "Open Cards", onClick: () => setView("cards") } : undefined}
    >
      {ready ? (
        <BarList
          label="Records per template"
          rows={summary.byType.slice(0, TOP_TEMPLATES).map(([id, count]) => ({
            key: id,
            label: typeOf(id).name,
            color: typeOf(id).color,
            count,
            action: `Show the ${n(count)} ${typeOf(id).name} records`,
            onClick: () => enter("cards", () => setTypes({ [id]: true })),
          }))}
          more={
            summary.byType.length > TOP_TEMPLATES
              ? { label: `${plural(summary.byType.length - TOP_TEMPLATES, "more template")} in Cards`, onClick: () => setView("cards") }
              : undefined
          }
        />
      ) : (
        <BarSkeleton rows={TOP_TEMPLATES} />
      )}
    </Section>
  );
  // Contains and Language, one card: each holds two to five rows, too few for
  // a card of their own. `grow`: the last card in its column takes the slack.
  const contentCard = (grow: boolean) => (
    <Card label="Content" className={grow ? "flex-1" : ""}>
      <div className={`grid grid-cols-1 gap-x-8 gap-y-4 ${!ready || (showContains && showLanguages) ? "@xl:grid-cols-2" : ""}`}>
        {(!ready || showContains) && (
          <Group title="Contains" note={ready ? `of ${plural(total, "record")}` : undefined}>
            {ready ? (
              <BarList
                label="Records by what they contain"
                scaleTo={total}
                rows={contentRows.map((r) => ({
                  key: `${r.group}:${r.id}`,
                  label: r.label,
                  count: r.count,
                  action: `Show the ${n(r.count)} records with ${r.label.toLowerCase()}`,
                  onClick: () => enter("cards", () => setContent({ [r.group]: { [r.id]: true } })),
                }))}
              />
            ) : (
              <BarSkeleton rows={2} />
            )}
          </Group>
        )}
        {(!ready || showLanguages) && (
          <Group title="Language" note={ready ? `of ${plural(total, "record")}` : undefined}>
            {ready ? (
              <BarList
                label="Records by the language of their content"
                scaleTo={total}
                rows={summary.languages.map(([l, count]) => ({
                  key: `language:${l}`,
                  label: l,
                  count,
                  action: `Show the ${n(count)} records in ${l}`,
                  onClick: () => enter("cards", () => setContent({ language: { [l]: true } })),
                }))}
              />
            ) : (
              <BarSkeleton rows={2} />
            )}
          </Group>
        )}
      </div>
    </Card>
  );
  // A community's template is shown only where the listed ones differ; the
  // same template under every row says nothing.
  const listed = network?.communities.slice(0, TOP_COMMUNITIES) ?? [];
  const mixedTemplates = new Set(listed.map((c) => c.typeId)).size > 1;
  const networkCard = (grow: boolean) => showNetwork && network && (
    <Section
      title="Connections"
      className={grow ? "flex-1" : ""}
      action={{ label: "Open Network", onClick: () => setView("network") }}
      note={`${plural(network.communities.length, "community", "communities")} of linked records`}
    >
      <BarList
        label="Largest communities"
        rows={listed.map((c) => ({
          key: String(c.id),
          label: c.name,
          color: mixedTemplates ? typeOf(c.typeId).color : undefined,
          sub: c.with.length ? `with ${c.with.join(", ")}` : undefined,
          count: c.size,
          action: `Open the Network on ${c.name}'s community, ${plural(c.size, "record")}`,
          onClick: () => {
            setCentre(c.id);
            setView("network");
          },
        }))}
      />
    </Section>
  );

  return (
    <div data-component="LibraryOverview" aria-busy={loading} className="@container flex flex-col gap-2 pb-3">
      {/* ── Header ── */}
      {/* The collection's title page: its name, what it is at a reading
          measure, and the key figures. The same card as the sections below,
          so its edges, padding and gaps line up with theirs. */}
      <header data-part="header" className="flex flex-col gap-4 p-4 rounded-lg bg-paper">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink leading-tight truncate">{settings.name || "Untitled collection"}</h1>
          {settings.description && (
            <p className="mt-2 max-w-[40rem] text-sm text-ink-secondary leading-relaxed line-clamp-3 @xl:line-clamp-2" title={settings.description}>
              {settings.description}
            </p>
          )}
        </div>
        <dl data-part="stats" className="grid grid-cols-2 gap-x-4 gap-y-3 @xl:flex @xl:flex-wrap @xl:items-end @xl:gap-x-12">
          <Stat label="Records" value={ready ? n(total) : null} />
          {(!ready || span) && <Stat
              label="Dates"
              value={ready ? span : null}
              title={datesFocus && fullSpan ? `${Math.round(FOCUS_SHARE * 100)}% of the dated records fall in this window. All dates: ${fullSpan}` : undefined}
              ltr
            />}
          {(!ready || summary.languages.length > 0) && (
            <Stat label={summary.languages.length === 1 ? "Language" : "Languages"} value={ready ? n(summary.languages.length) : null} />
          )}
          <Stat label={summary.byType.length === 1 ? "Template" : "Templates"} value={ready ? n(summary.byType.length) : null} />
          {(!ready || (summary.contains.get("document") ?? 0) > 0) && (
            <Stat label="Documents" value={ready ? n(summary.contains.get("document") ?? 0) : null} />
          )}
          {(!ready || summary.located > 0) && <Stat label="Located" value={ready ? n(summary.located) : null} />}
        </dl>
      </header>

      {/* ── What, where, and how it is connected ──
          Two columns that size to their content. The start side lists: the
          templates, then the communities. The end side is the map, which
          takes whatever height the column has left (a tall fit such as the
          Americas needs it), over the Content card. Without a map the Content
          card moves under the templates and Connections has the end side. */}
      <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-2">
        <div className="flex flex-col gap-2 min-w-0">
          {templatesCard}
          {ready ? (
            showMap ? networkCard(true) : showContent && contentCard(true)
          ) : (
            // Most collections have a map, so the loading layout is the
            // mapped one: Connections here, Content under the map. Six short
            // rows hold the height of four two-line communities.
            <Section title="Connections" className="flex-1">
              <BarSkeleton rows={6} />
            </Section>
          )}
        </div>
        {(!ready || showMap || showNetwork) && (
          <div className="flex flex-col gap-2 min-w-0">
            {ready ? (
              showMap ? (
                <>
                  {mapCard}
                  {showContent && contentCard(false)}
                </>
              ) : (
                networkCard(true)
              )
            ) : (
              <>
                <Section title="Where" className={`flex-1 ${MAP_MIN_H}`}>
                  <div aria-hidden className="flex-1 rounded-md bg-vellum" />
                </Section>
                {contentCard(false)}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Timeline ── */}
      {showLanes && (
        <Section
          title="Over time"
          note={ready ? scaleNote ?? undefined : undefined}
          action={ready ? { label: "Open Timeline", onClick: () => setView("timeline") } : undefined}
        >
          {ready ? (
            <OverviewLanes
              entities={entities}
              typeOf={typeOf}
              onScale={setScaleNote}
              onLane={(typeId) => enter("timeline", () => setTypes({ [typeId]: true }))}
              onCell={(typeId, b, fine) =>
                enter("timeline", () => {
                  setTypes({ [typeId]: true });
                  // A minute or an hour is a timed bound; a day and up, days.
                  setFrom(fine ? toBound(b.start) : toISODate(b.start));
                  setTo(fine ? toBound(b.end - 1000) : toISODate(b.end - DAY));
                })
              }
            />
          ) : (
            <BarSkeleton rows={LANES} />
          )}
        </Section>
      )}

      {/* ── Sync quality (Las Vegas) ──
          How closely the recordings agree on each volley's clock. A row opens
          the volley; the full table lists every aligned moment. */}
      {ready && sync && sync.moments.some((m) => m.volley) && (
        <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-2">
        <Section
          title="Sync quality"
          note={`${pct(sync.totals.within2, sync.totals.counted)} of ${n(sync.totals.counted)} annotations within 2 s of their moment's median`}
          action={{ label: "Open table", onClick: () => setSyncTableOpen(true) }}
        >
          <div aria-hidden className="flex items-center gap-3 h-6 px-0 text-meta font-semibold uppercase tracking-wider text-ink-tertiary">
            <span className="flex-1 min-w-0">Volley</span>
            <span className="hidden @xl:block w-16 text-end">Gap</span>
            <span className="w-14 @xl:w-20 text-end">Rec.</span>
            <span className="w-14 @xl:w-20 text-end">Spread</span>
            <span className="w-16 @xl:w-24 text-end">Outliers</span>
          </div>
          <ul aria-label="Sync quality by volley" className="flex flex-col -mx-2">
            {sync.moments
              .filter((m) => m.volley)
              .sort((a, b) => a.volley! - b.volley!)
              .map((m) => {
                const gap = sync.intervals.find((i) => i.to === m.volley)?.seconds;
                return (
                  <li key={m.momentId}>
                    <RowButton
                      onClick={() => openRecord(m.momentId)}
                      label={`Open ${momentName(m)}: ${plural(m.recordings, "recording")}, spread ${m.spread} s, ${plural(m.outliers.length, "outlier")}`}
                    >
                      <span className="min-w-0 flex-1 flex items-baseline gap-2">
                        <span className="text-sm text-ink truncate">{momentName(m)}</span>
                        <span className="text-xs text-ink-tertiary tabular-nums">{m.median !== null ? formatClock(m.median) : ""}</span>
                      </span>
                      <span className="hidden @xl:block w-16 text-end text-xs text-ink-tertiary tabular-nums">{gap !== undefined ? `+${gap} s` : ""}</span>
                      <span className="w-14 @xl:w-20 text-end text-xs text-ink-secondary tabular-nums">{m.recordings}</span>
                      <span className="w-14 @xl:w-20 text-end text-xs text-ink-secondary tabular-nums">{m.spread} s</span>
                      <span className={`w-16 @xl:w-24 text-end text-xs tabular-nums ${m.outliers.length ? "text-warning-label font-semibold" : "text-ink-tertiary"}`}>
                        {m.outliers.length || "None"}
                      </span>
                    </RowButton>
                  </li>
                );
              })}
          </ul>
        </Section>
        {sync.comparisons.length > 0 && (
          <Section title="Against other accounts" note="Known from press summaries, not read at source">
            <ComparisonList rows={sync.comparisons} onOpen={openRecord} />
          </Section>
        )}
        </div>
      )}
      {syncTableOpen && sync && (
        <VegasSyncTable
          sync={sync}
          onClose={() => setSyncTableOpen(false)}
          onOpenMoment={(id) => {
            setSyncTableOpen(false);
            openRecord(id);
          }}
        />
      )}

      {/* ── Facets ──
          One card, a column per property: a property with two values beside
          one with six no longer leaves a card mostly empty. */}
      {ready && facets.length > 0 && (
        <Card label="Most used values">
          <div className={`grid grid-cols-1 gap-x-8 gap-y-4 ${facets.length === 1 ? "" : facets.length === 2 ? "@3xl:grid-cols-2" : "@3xl:grid-cols-2 @6xl:grid-cols-3"}`}>
            {facets.map((f) => (
              <Group key={f.key} title={f.title} note={plural(f.distinct, "value")}>
                <BarList
                  label={`${f.title}, most used values`}
                  rows={f.values.map(([v, count]) => ({
                    key: v,
                    label: v,
                    count,
                    action: `Show the ${n(count)} records with ${f.title} ${v}`,
                    onClick: () =>
                      enter("cards", () => {
                        if (f.kind === "country") setCountries({ [v]: true });
                        else if (f.kind === "descriptor") setDescriptors({ [v]: true });
                        else setInherited({ [f.key]: { [v]: true } });
                      }),
                  }))}
                />
              </Group>
            ))}
          </div>
        </Card>
      )}

      {/* ── Recently modified · Yours ── */}
      {(showRecent || showYours) && (
        <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-2">
          {showRecent && (
            <Section title="Recently modified">
              <RecordList
                records={recent.map((e) => ({ e, meta: formatDay(Date.parse(e.updatedAt!)) }))}
                typeOf={typeOf}
                onOpen={openRecord}
              />
            </Section>
          )}
          {showYours && (
            <Section title="Saved views and pins">
              <ul className="flex flex-col -mx-2">
                {views.map((v) => {
                  const k = snapshotFilterCount(v.snapshot);
                  return (
                    <li key={v.id}>
                      <RowButton onClick={() => applySnapshot(v.snapshot)} label={`Open saved view ${v.name}`}>
                        <Bookmark size={13} aria-hidden className="shrink-0 text-ink-muted" />
                        <span className="min-w-0 flex-1 truncate text-sm text-ink" title={v.name}>{v.name}</span>
                        <span className="shrink-0 text-xs text-ink-tertiary tabular-nums">
                          {k === 0 ? "No filters" : plural(k, "filter")}
                        </span>
                      </RowButton>
                    </li>
                  );
                })}
                {pins.map((e) => (
                  <li key={e.id}>
                    <RowButton onClick={() => openRecord(e.id)} label={`Open ${e.title}`}>
                      <Pin size={13} aria-hidden className="shrink-0 text-ink-muted" />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink" title={e.title}>{e.title}</span>
                      <TemplateName type={typeOf(e.typeId)} />
                    </RowButton>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Parts ────────────────────────────────────────────────────────────── */

function Stat({ label, value, title, ltr = false }: { label: string; value: string | null; title?: string; ltr?: boolean }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <dt className="text-meta font-semibold uppercase tracking-wider text-ink-tertiary">{label}</dt>
      <dd className="h-7 flex items-center text-xl font-semibold text-ink tabular-nums truncate">
        {value === null ? (
          <span aria-hidden className="block w-16 h-4 rounded-sm bg-vellum" />
        ) : (
          // Dates and ranges read left to right in an RTL page too.
          <span dir={ltr ? "ltr" : undefined} title={title}>
            {value}
          </span>
        )}
      </dd>
    </div>
  );
}

/** A paper card. Its height is its content's unless the layout stretches it. */
function Card({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <section data-part="section" aria-label={label} className={`flex flex-col min-w-0 p-4 rounded-lg bg-paper ${className}`}>
      {children}
    </section>
  );
}

/** A titled block: a caps label, a note, and the way into the view that
 *  shows it in full. A card holds one or several. */
function Group({
  title,
  note,
  action,
  children,
}: {
  title: string;
  note?: string;
  action?: { label: string; onClick: () => void };
  children: ReactNode;
}) {
  return (
    <div role="group" aria-label={title} className="flex flex-col flex-1 min-w-0 min-h-0">
      {/* A phone has no tooltip to recover a cut note: there it takes a line
          of its own under the label and wraps. */}
      <header className="shrink-0 flex flex-wrap items-center gap-x-2 min-h-6 mb-2">
        <SectionLabel as="h2" className="shrink-0">{title}</SectionLabel>
        {note && (
          <span className="order-last basis-full text-xs text-ink-tertiary tabular-nums @xl:order-none @xl:basis-auto @xl:min-w-0 @xl:flex-1 @xl:truncate" title={note}>
            {note}
          </span>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="ms-auto shrink-0 flex items-center gap-1 h-6 px-1.5 -me-1.5 rounded-md text-xs font-medium text-ink-secondary hover:text-ink hover:bg-warm transition-colors cursor-pointer
              focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
          >
            {action.label}
            <ArrowRight size={12} aria-hidden className="rtl:-scale-x-100" />
          </button>
        )}
      </header>
      {children}
    </div>
  );
}

/** A card with one group. */
function Section({
  title,
  className = "",
  action,
  note,
  children,
}: {
  title: string;
  className?: string;
  action?: { label: string; onClick: () => void };
  note?: string;
  children: ReactNode;
}) {
  return (
    <Card label={title} className={className}>
      <Group title={title} note={note} action={action}>
        {children}
      </Group>
    </Card>
  );
}

function RowButton({
  onClick,
  label,
  tall = false,
  children,
}: {
  onClick: () => void;
  label: string;
  /** Two lines: a name with its template under it. */
  tall?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group w-full flex items-center gap-3 ${tall ? "h-11" : "h-7"} px-2 rounded-md text-start hover:bg-warm transition-colors cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/40`}
    >
      {children}
    </button>
  );
}

function TemplateName({ type }: { type: EntityType }) {
  return (
    <span className="shrink-0 flex items-center gap-1.5 min-w-0 max-w-[45%]">
      <span aria-hidden className="w-2 h-2 shrink-0 rounded-[2px]" style={{ backgroundColor: type.color }} />
      <span className="truncate text-xs" style={{ color: typeLabelColor(type.color) }}>
        {type.name}
      </span>
    </span>
  );
}

interface BarRow {
  key: string;
  label: string;
  /** A template: its colour on a dot beside the label. */
  color?: string;
  /** A second line under the label (a community's other leading records). */
  sub?: string;
  count: number;
  action: string;
  onClick: () => void;
}

/** A ranked list of horizontal bars, each drawn to scale from zero against
 *  `scaleTo` (the largest row when absent). The label takes the row; the bar
 *  has a short track of its own at the end, the exact count right after it,
 *  so a number is never far from its bar. One quiet ink tint for every bar:
 *  identity, where there is one, is the template dot, and the label stays
 *  ink. */
function BarList({
  rows,
  label,
  scaleTo,
  more,
}: {
  rows: BarRow[];
  label: string;
  scaleTo?: number;
  /** A last row for what the list leaves out ("4 more templates in Cards"). */
  more?: { label: string; onClick: () => void };
}) {
  const max = scaleTo ?? Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul aria-label={label} className="flex flex-col -mx-2">
      {rows.map((r) => (
        <li key={r.key}>
          <RowButton onClick={r.onClick} label={r.action} tall={!!r.sub}>
            <span className="min-w-0 flex-1 flex flex-col justify-center">
              <span className="min-w-0 flex items-center gap-1.5">
                {r.color && <span aria-hidden className="w-2 h-2 shrink-0 rounded-[2px]" style={{ backgroundColor: r.color }} />}
                {/* A truncated name keeps its whole text in the tooltip. */}
                <span className="min-w-0 truncate text-sm text-ink" title={r.label}>
                  {r.label}
                </span>
              </span>
              {r.sub && (
                <span className="min-w-0 truncate text-xs text-ink-tertiary" title={r.sub}>
                  {r.sub}
                </span>
              )}
            </span>
            <span aria-hidden className="relative shrink-0 w-[28%] max-w-[9rem] h-1.5 rounded-full bg-ink/5">
              <span
                className="absolute inset-y-0 start-0 rounded-full bg-ink/20 group-hover:bg-ink/40 transition-colors"
                style={{ width: `${Math.max(1, (r.count / max) * 100)}%` }}
              />
            </span>
            <span className="shrink-0 w-12 text-end text-xs text-ink-secondary tabular-nums group-hover:text-ink">{n(r.count)}</span>
          </RowButton>
        </li>
      ))}
      {more && (
        <li>
          <RowButton onClick={more.onClick} label={`Open Cards: ${more.label}`}>
            <span className="min-w-0 truncate text-xs font-medium text-ink-secondary group-hover:text-ink">{more.label}</span>
            <ArrowRight size={12} aria-hidden className="shrink-0 text-ink-tertiary rtl:-scale-x-100" />
          </RowButton>
        </li>
      )}
    </ul>
  );
}

function BarSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 h-7">
          <span className="flex-1 min-w-0"><span className="block h-3 rounded-sm bg-vellum" style={{ width: `${Math.max(30, 70 - i * 5)}%` }} /></span>
          <span className="shrink-0 w-[28%] max-w-[9rem] h-1.5 rounded-full bg-vellum" />
          <span className="shrink-0 w-12" />
        </div>
      ))}
    </div>
  );
}

function RecordList({
  records,
  typeOf,
  onOpen,
}: {
  records: { e: Entity; meta: string }[];
  typeOf: (id: string) => EntityType;
  onOpen: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col -mx-2">
      {records.map(({ e, meta }) => (
        <li key={e.id}>
          <RowButton onClick={() => onOpen(e.id)} label={`Open ${e.title}`}>
            <span className="min-w-0 flex-1 truncate text-sm text-ink" title={e.title}>{e.title}</span>
            <TemplateName type={typeOf(e.typeId)} />
            <span className="shrink-0 w-[5.5rem] text-end text-xs text-ink-tertiary tabular-nums">{meta}</span>
          </RowButton>
        </li>
      ))}
    </ul>
  );
}

const sameDay = (a: number, b: number) => toISODate(a) === toISODate(b);
/** "22:05", or "22:05:10" for seconds, in UTC like every collection date. */
const clock = (ms: number, unit: TimeUnit) => new Date(ms).toISOString().slice(11, unit === "second" ? 19 : 16);

/** "1969 – 2025", or days for a span shorter than two years. */
function formatSpan(min: number, max: number): string {
  if (max - min < 2 * 365 * DAY) return min === max ? formatDay(min) : `${formatDay(min)} – ${formatDay(max)}`;
  const a = new Date(min).getUTCFullYear();
  const b = new Date(max).getUTCFullYear();
  return a === b ? String(a) : `${a} – ${b}`;
}

/** The shortest window that holds FOCUS_SHARE of the dated records, by each
 *  record's precise time, when it is under FOCUS_RATIO of the whole span;
 *  null otherwise. The lanes draw it instead of the whole span, and the
 *  header's Dates figure names it. */
function focusWindow(dated: Entity[], full: { min: number; max: number } | null) {
  if (!full || dated.length === 0) return null;
  const times = dated.map((e) => preciseTime(e)!).sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(times.length * FOCUS_SHARE));
  let lo = times[0], hi = times[times.length - 1];
  for (let i = 0; i + k - 1 < times.length; i++) {
    const w = times[i + k - 1] - times[i];
    if (w < hi - lo) {
      lo = times[i];
      hi = times[i + k - 1];
    }
  }
  if (hi - lo >= (full.max - full.min) * FOCUS_RATIO) return null;
  const outside = times.filter((t) => t < lo || t > hi).length;
  return { min: lo, max: hi, outside };
}

/** A focused window in words: "1 Oct 2017, 22:00–22:20" within a day (to the
 *  minute, as the time section's columns read), else as `formatSpan`. */
function formatWindow(min: number, max: number): string {
  if (!sameDay(min, max)) return formatSpan(min, max);
  const lo = Math.floor(min / 60_000) * 60_000;
  const hi = Math.floor(max / 60_000) * 60_000;
  const day = new Date(min).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${day}, ${clock(lo, "minute")}–${clock(hi, "minute")}`;
}

/* ── Timeline lanes ───────────────────────────────────────────────────── */

/** The Timeline view's Lanes, reduced: the six largest templates, one column
 *  per period at the finest unit that fits, a dot's area its count on one
 *  scale. The range is where the records are: when most of them sit in a
 *  small part of the whole span (the Vegas recordings, twenty minutes of one
 *  night in a span of nine years) the lanes draw that window, and say so and
 *  how many records fall outside it. A lane opens Timeline on its template; a
 *  dot, on its template and period. */
function OverviewLanes({
  entities,
  typeOf,
  onScale,
  onLane,
  onCell,
}: {
  entities: Entity[];
  typeOf: (id: string) => EntityType;
  /** The scale in words ("By year, 1986 – 2021"), for the section's note. */
  onScale: (note: string | null) => void;
  onLane: (typeId: string) => void;
  /** `fine`: the bucket is shorter than a day, so its bounds carry a time. */
  onCell: (typeId: string, b: TimeBucket, fine: boolean) => void;
}) {
  const [w, setW] = useState(0);
  const ro = useRef<ResizeObserver | null>(null);
  // Measured in the ref itself: it runs again on every mount, which a
  // cleanup effect under StrictMode's double mount would not.
  const hostRef = useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    ro.current = null;
    if (!el) return;
    setW(Math.round(el.clientWidth));
    ro.current = new ResizeObserver(([entry]) => setW(Math.round(entry.contentRect.width)));
    ro.current.observe(el);
  }, []);
  const [hover, setHover] = useState<string | null>(null);

  const dated = useMemo(() => entities.filter((e) => entityTime(e) !== null), [entities]);
  const full = useMemo(() => timeExtent(dated), [dated]);
  const focus = useMemo(() => focusWindow(dated, full), [dated, full]);
  const extent = focus ?? full;
  // Wide enough at desktop widths for the longest template names CEJIL has
  // ("Geolocalización de los hechos del caso"); a cut name keeps a tooltip.
  // Below 560 each lane's name sits on its own line over the dots.
  const stacked = w > 0 && w < 560;
  const labelW = stacked ? 0 : w < 900 ? 200 : 264;
  const countW = stacked ? 0 : 48;
  const plotW = Math.max(0, w - labelW - countW);

  const unit = useMemo((): TimeUnit => {
    if (!extent) return "year";
    const span = extent.max - extent.min;
    const fits = (u: TimeUnit) => (span / UNIT_MS[u] + 1) * (u === "year" ? LANE_YEAR_MIN : LANE_COL_MIN) <= plotW;
    // Whole collections stay at month or coarser; a focused window may go
    // down to the minute.
    const units: TimeUnit[] = focus ? ["second", "minute", "hour", "day", "month", "quarter", "year"] : ["month", "quarter", "year"];
    return units.find(fits) ?? "year";
  }, [extent, plotW, focus]);
  const fine = unit === "second" || unit === "minute" || unit === "hour";

  const { cols, lanes, max, more } = useMemo(() => {
    if (!extent || plotW <= 0) return { cols: [] as TimeBucket[], lanes: [], max: 1, more: 0 };
    const cols = bucketSeries(dated, unit, extent, fine ? preciseTime : entityTime);
    const byType = new Map<string, Map<string, number>>();
    for (const c of cols)
      for (const e of c.entities) {
        const lane = byType.get(e.typeId) ?? new Map<string, number>();
        lane.set(c.key, (lane.get(c.key) ?? 0) + 1);
        byType.set(e.typeId, lane);
      }
    const all = [...byType.entries()]
      .map(([typeId, cells]) => ({ typeId, cells, total: [...cells.values()].reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total);
    const lanes = all.slice(0, LANES);
    let max = 1;
    for (const l of lanes) for (const v of l.cells.values()) max = Math.max(max, v);
    return { cols, lanes, max, more: all.length - lanes.length };
  }, [dated, unit, extent, plotW, fine]);

  useEffect(() => {
    if (!cols.length) return onScale(null);
    const first = cols[0], last = cols[cols.length - 1];
    const range = fine
      ? sameDay(first.start, last.start)
        ? `${formatDay(first.start)}, ${clock(first.start, unit)}–${clock(last.start, unit)}`
        : `${formatMoment(first.start, true)} – ${formatMoment(last.start, true)}`
      : first.label === last.label
        ? first.label
        : `${first.label} – ${last.label}`;
    onScale(`By ${unit}, ${range}`);
  }, [cols, unit, fine, onScale]);

  const colW = cols.length ? Math.max(unit === "year" ? LANE_YEAR_MIN : LANE_COL_MIN, plotW / cols.length) : 0;
  const rMax = Math.min(colW, LANE_H) / 2 - 1;
  const radius = (v: number) => Math.max(1.5, Math.sqrt(v / max) * rMax);

  const ticks = useMemo(() => {
    const steps = TICK_STEPS[unit];
    const k = steps.find((st) => colW * st >= LANE_LABEL_PITCH) ?? steps[steps.length - 1];
    const totalW = cols.length * colW;
    const half = LANE_LABEL_PITCH / 2 - 4;
    const out: { i: number; label: string; x: number }[] = [];
    cols.forEach((c, i) => {
      const d = new Date(c.start);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const rank =
        unit === "year" ? y
        : unit === "quarter" ? m / 3
        : unit === "month" ? m
        : unit === "day" ? d.getUTCDate() - 1
        : unit === "hour" ? d.getUTCHours()
        : unit === "minute" ? d.getUTCMinutes()
        : d.getUTCSeconds();
      if (rank % k !== 0) return;
      const label =
        unit === "second" ? clock(c.start, "second")
        : fine ? clock(c.start, unit)
        : unit === "day" ? `${d.getUTCDate()} ${MONTH_SHORT[m]}`
        : unit === "year" || m === 0 ? String(y)
        : unit === "quarter" ? `Q${m / 3 + 1}`
        : MONTH_SHORT[m];
      const x = Math.min(Math.max((i + 0.5) * colW, half), totalW - half);
      if (out.length && x - out[out.length - 1].x < LANE_LABEL_PITCH * 0.8) return;
      out.push({ i, label, x });
    });
    return out;
  }, [cols, colW, unit, fine]);

  return (
    <div ref={hostRef} data-component="OverviewLanes" className="flex-1 min-h-0 flex flex-col">
      {cols.length > 0 && (
        <>
          {/* A range too long even for years scrolls here, never the page. */}
          <div dir="ltr" className="flex flex-col overflow-x-auto overflow-y-hidden">
            {lanes.map((lane) => {
              const type = typeOf(lane.typeId);
              const name = (
                <>
                  <span aria-hidden className="w-2 h-2 shrink-0 rounded-[2px] ms-1" style={{ backgroundColor: type.color }} />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-secondary">{type.name}</span>
                  <span className="shrink-0 w-10 text-end text-xs tabular-nums text-ink-tertiary">{n(lane.total)}</span>
                </>
              );
              const laneButton = (
                <button
                  type="button"
                  onClick={() => onLane(lane.typeId)}
                  aria-label={`Open Timeline on ${type.name}, ${plural(lane.total, "dated record")}`}
                  className={`shrink-0 flex items-center gap-1.5 pe-2 rounded-md text-start hover:bg-warm cursor-pointer
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/40 ${stacked ? "h-5 w-full" : "h-full"}`}
                  style={stacked ? undefined : { width: labelW + countW }}
                  title={type.name}
                >
                  {name}
                </button>
              );
              return (
                <div key={lane.typeId} className={stacked ? "flex flex-col" : "flex items-center"} style={stacked ? undefined : { height: LANE_H }}>
                  {laneButton}
                  <div className="relative flex" style={{ width: cols.length * colW, height: LANE_H }}>
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-1/2 h-px pointer-events-none"
                      style={{ backgroundColor: "var(--border-soft)" }}
                    />
                    {cols.map((c) => {
                      const v = lane.cells.get(c.key) ?? 0;
                      if (!v) return <div key={c.key} className="shrink-0" style={{ width: colW }} />;
                      const id = `${lane.typeId}:${c.key}`;
                      const r = radius(v);
                      return (
                        <div key={c.key} className="relative shrink-0 h-full" style={{ width: colW }}>
                          <button
                            type="button"
                            aria-label={`${type.name}, ${c.label}: ${plural(v, "record")}. Open Timeline on it`}
                            onClick={() => onCell(lane.typeId, c, fine)}
                            onMouseEnter={() => setHover(id)}
                            onMouseLeave={() => setHover(null)}
                            onFocus={() => setHover(id)}
                            onBlur={() => setHover(null)}
                            className="absolute inset-0 flex items-center justify-center cursor-pointer rounded-sm
                              focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
                          >
                            <span
                              className="rounded-full"
                              style={{
                                width: r * 2,
                                height: r * 2,
                                backgroundColor: type.color,
                                opacity: hover === id ? 1 : 0.8,
                              }}
                            />
                          </button>
                          {hover === id && (
                            <ChartTip anchor="above">
                              {type.name} · {c.label} · {plural(v, "record")}
                            </ChartTip>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {/* The time axis, under the lanes. */}
            <div className="flex h-5">
              <div className="shrink-0" style={{ width: labelW + countW }} />
              <div className="relative" style={{ width: cols.length * colW }}>
                {ticks.map((t) => (
                  <span
                    key={t.i}
                    className="absolute top-1 -translate-x-1/2 text-meta leading-none tabular-nums text-ink-tertiary whitespace-nowrap"
                    style={{ left: t.x }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-auto pt-1 text-xs text-ink-tertiary">
            Dot area is the number of dated records per {unit}.
            {focus && focus.outside > 0 && ` ${plural(focus.outside, "dated record")} outside this window${full ? `, ${formatSpan(full.min, full.max)},` : ""} in Timeline.`}
            {more > 0 && ` ${plural(more, "more template")} in Timeline.`}
          </p>
        </>
      )}
    </div>
  );
}

/* ── Facets ───────────────────────────────────────────────────────────── */

interface FacetSummary {
  key: string;
  kind: "country" | "descriptor" | "property";
  title: string;
  distinct: number;
  values: [string, number][];
}

/** The first property facets the Filters panel lists for this collection
 *  (with no template ticked: CEJIL's Descriptores, then Countries, then the
 *  templates' default filters), up to three that hold two or more values,
 *  each with its most used values. */
function useFacetSummaries(entities: Entity[], source: DataSource, language: Language, ready: boolean): FacetSummary[] {
  const templates = useAtomValue(templatesAtom(source));
  return useMemo(() => {
    if (!ready) return [];
    const candidates: { key: string; kind: FacetSummary["kind"]; title: string; valuesOf: (e: Entity) => readonly string[] }[] = [];
    if (source === "cejil") candidates.push({ key: "descriptor", kind: "descriptor", title: "Descriptores", valuesOf: (e) => e.descriptors ?? [] });
    candidates.push({ key: "country", kind: "country", title: "Countries", valuesOf: (e) => entityCountries(e, language) });
    for (const def of libraryInheritedDefs(source, language))
      if (!def.templateIds || def.defaultFilter)
        candidates.push({
          key: def.propId,
          kind: "property",
          title: def.label,
          valuesOf: (e) => entityInheritedValues(e, def, language, source),
        });
    const out: FacetSummary[] = [];
    for (const c of candidates) {
      if (out.length >= 3) break;
      const tally = new Map<string, number>();
      for (const e of entities) for (const v of c.valuesOf(e)) if (v) tally.set(v, (tally.get(v) ?? 0) + 1);
      if (tally.size < 2) continue;
      const values = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, TOP_VALUES);
      out.push({ key: c.key, kind: c.kind, title: c.title, distinct: tally.size, values });
    }
    return out;
    // `templates`: the property facets are read from the template store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities, source, language, ready, templates]);
}

/* ── Network ──────────────────────────────────────────────────────────── */

interface CommunitySummary {
  id: number;
  /** The member with most neighbours. */
  name: string;
  /** The next two by neighbours: what tells this community from the others. */
  with: string[];
  typeId: string;
  size: number;
}

/** The collection's communities, largest first, from the Network view's own
 *  graph and stored layout. Null until the layout file has loaded, or where
 *  the collection has no links. */
function useNetworkSummary(source: DataSource, ready: boolean): { communities: CommunitySummary[] } | null {
  const graph = useAtomValue(networkGraphAtom);
  const [stored, setStored] = useState<{ source: DataSource; layout: StoredLayout | null } | null>(null);
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    loadNetworkLayout(source).then(
      (layout) => alive && setStored({ source, layout }),
      () => alive && setStored(null),
    );
    return () => {
      alive = false;
    };
  }, [source, ready]);
  return useMemo(() => {
    if (!ready || !stored || stored.source !== source || graph.a.length === 0) return null;
    const placement = placeNetworkCached(graph, stored.layout);
    return {
      communities: placement.communities
        .filter((c) => c.members.length > 1)
        .map((c) => {
          const title = (i: number) => getEntity(graph.ids[i])?.title ?? graph.ids[i];
          const lead = [...c.members].sort((p, q) => graph.degree[q] - graph.degree[p] || p - q)
            .filter((i) => i !== c.top && canNameCommunity(graph, i));
          return {
          id: c.id,
          name: title(c.top),
          with: lead.slice(0, 2).map(title),
          typeId: c.typeId,
          size: c.members.length,
          };
        }),
    };
  }, [ready, stored, source, graph]);
}
