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
import { notebookAtom } from "../../atoms/notebook";
import { applyLibrarySnapshotAtom, savedViewsAtom, snapshotFilterCount } from "../../atoms/savedViews";
import { templatesAtom } from "../../atoms/templates";
import { getEntity, getEntityType, type Entity, type EntityType } from "../../data/entities";
import { loadNetworkLayout, placeNetworkCached, type StoredLayout } from "../../data/network/layout";
import { CONTENT_ROWS, entityContent } from "../../utils/entityContent";
import { entityCountries, entityInheritedValues, libraryInheritedDefs } from "../../utils/libraryFacets";
import type { MapBounds } from "../../utils/libraryFilter";
import { bucketSeries, entityTime, formatDay, timeExtent, toISODate, type TimeBucket, type TimeUnit } from "../../utils/timeline";
import { typeLabelColor } from "../../utils/typeColor";
import { SectionLabel } from "../shared/SectionLabel";
import { ChartTip } from "./BucketBreakdown";

const OverviewMap = lazy(() => import("./OverviewMap"));

/* The Library's Overview: what the collection holds, on one page, and a way
 * into each part of it. Every chart is an entry point: a click applies the
 * filter it stands for and opens the view that shows it best
 * (`libraryOverviewOriginAtom` then brings the reader back here when they
 * clear it). It reads the whole collection, never the filters: the Overview
 * has none (`LibraryView` leaves it when one is set or a search starts).
 *
 * A section the collection has nothing for is left out. While a lazy corpus
 * loads, the header and the first two rows hold their final heights, so
 * nothing above the fold moves when it lands. */

/** Fixed heights, shared by the loading state and the loaded one. */
const HEADER_H = "8.5rem";
const ROW_A_H = "20rem";
const LANES_H = "16.5rem";
const ROW_C_H = "18rem";
const FACET_H = "16rem";
const ROW_E_H = "14rem";

/** Lanes the Overview's timeline draws; the Timeline view draws every one. */
const LANES = 6;
const LANE_H = 24;
const LANE_COL_MIN = 12;
const LANE_YEAR_MIN = 6;
const LANE_LABEL_PITCH = 40;
/** Facet values and communities listed per card. */
const TOP_VALUES = 6;
const TOP_COMMUNITIES = 5;
const RECENT = 5;
/** The map is drawn when this share of the records, or this many, are located. */
const MAP_SHARE = 0.1;
const MAP_MIN = 50;

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86_400_000;
const n = (v: number) => v.toLocaleString();
const plural = (v: number, one: string, many = `${one}s`) => `${n(v)} ${v === 1 ? one : many}`;

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
    let lastModified = -Infinity;
    for (const e of entities) {
      byType.set(e.typeId, (byType.get(e.typeId) ?? 0) + 1);
      const c = entityContent(e, source);
      for (const k of c.contains ?? []) contains.set(k, (contains.get(k) ?? 0) + 1);
      for (const k of c.language ?? []) languages.set(k, (languages.get(k) ?? 0) + 1);
      if (c.quotes?.includes("has")) quoted++;
      if (e.geo) located++;
      const m = e.updatedAt ? Date.parse(e.updatedAt) : NaN;
      if (m > lastModified) lastModified = m;
    }
    return {
      byType: [...byType.entries()].sort((a, b) => b[1] - a[1]),
      contains,
      languages: [...languages.entries()].sort((a, b) => b[1] - a[1]),
      quoted,
      located,
      lastModified: Number.isFinite(lastModified) ? lastModified : null,
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
  const showContent = ready && contentRows.length > 0;
  const showLanes = !ready || !!summary.extent;
  const notebook = useAtomValue(notebookAtom);
  const views = useAtomValue(savedViewsAtom);
  const pins = notebook.pins.map((p) => getEntity(p.id)).filter((e): e is Entity => !!e);
  const showYours = ready && (views.length > 0 || pins.length > 0);
  const showRecent = ready && recent.length > 0;

  const span = summary.extent ? formatSpan(summary.extent.min, summary.extent.max) : null;

  return (
    <div data-component="LibraryOverview" aria-busy={loading} className="@container flex flex-col gap-3 pb-3">
      {/* ── Header ── */}
      {/* Fixed height from two columns up; narrower, the stats may wrap onto
          a second line, the same while loading as once loaded. */}
      <header data-part="header" className="flex flex-col justify-between gap-3 pt-1 @3xl:h-[var(--overview-header-h)]" style={{ "--overview-header-h": HEADER_H } as React.CSSProperties}>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-ink leading-tight truncate">{settings.name || "Untitled collection"}</h1>
          {settings.description && (
            <p className="mt-1.5 max-w-[40rem] text-sm text-ink-secondary leading-snug line-clamp-2">{settings.description}</p>
          )}
        </div>
        <dl data-part="stats" className="flex flex-wrap items-end gap-x-8 gap-y-2 @3xl:h-11 @3xl:overflow-hidden">
          <Stat label="Records" value={ready ? n(total) : null} />
          {(!ready || span) && <Stat label="Dates" value={ready ? span : null} ltr />}
          {(!ready || summary.languages.length > 0) && (
            <Stat
              label={summary.languages.length === 1 ? "Language" : "Languages"}
              value={ready ? summary.languages.map(([l]) => l).join(", ") : null}
            />
          )}
          {(!ready || summary.lastModified !== null) && (
            <Stat label="Last modified" value={ready && summary.lastModified !== null ? formatDay(summary.lastModified) : null} ltr />
          )}
        </dl>
      </header>

      {/* ── What's in it · Content ── */}
      <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-3">
        <Section
          title="What's in it"
          height={ROW_A_H}
          className={ready && !showContent ? "@3xl:col-span-2" : ""}
          action={ready ? { label: "Open Cards", onClick: () => setView("cards") } : undefined}
        >
          {ready ? (
            <BarList
              label="Records per template"
              rows={summary.byType.map(([id, count]) => ({
                key: id,
                label: typeOf(id).name,
                color: typeOf(id).color,
                count,
                action: `Show the ${n(count)} ${typeOf(id).name} records`,
                onClick: () => enter("cards", () => setTypes({ [id]: true })),
              }))}
            />
          ) : (
            <BarSkeleton rows={8} />
          )}
        </Section>
        {(!ready || showContent) && (
          <Section title="Content" height={ROW_A_H}>
            {ready ? (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <BarList
                    label="Records by what they contain"
                    scaleTo={total}
                    scroll={false}
                    rows={contentRows.map((r) => ({
                      key: `${r.group}:${r.id}`,
                      label: r.label,
                      count: r.count,
                      action: `Show the ${n(r.count)} records with ${r.label.toLowerCase()}`,
                      onClick: () => enter("cards", () => setContent({ [r.group]: { [r.id]: true } })),
                    }))}
                  />
                  {summary.languages.length > 0 && (
                    <>
                      <h3 className="mt-3 mb-1 text-xs text-ink-tertiary">Language of the content</h3>
                      <BarList
                        label="Records by the language of their content"
                        scaleTo={total}
                        scroll={false}
                        rows={summary.languages.map(([l, count]) => ({
                          key: `language:${l}`,
                          label: l,
                          count,
                          action: `Show the ${n(count)} records in ${l}`,
                          onClick: () => enter("cards", () => setContent({ language: { [l]: true } })),
                        }))}
                      />
                    </>
                  )}
                </div>
                <p className="shrink-0 pt-2 text-xs text-ink-tertiary">Bars are the share of all {n(total)} records.</p>
              </>
            ) : (
              <BarSkeleton rows={4} />
            )}
          </Section>
        )}
      </div>

      {/* ── Timeline ── */}
      {showLanes && (
        <Section
          title="Over time"
          height={LANES_H}
          action={ready ? { label: "Open Timeline", onClick: () => setView("timeline") } : undefined}
        >
          {ready ? (
            <OverviewLanes
              entities={entities}
              typeOf={typeOf}
              onLane={(typeId) => enter("timeline", () => setTypes({ [typeId]: true }))}
              onCell={(typeId, b) =>
                enter("timeline", () => {
                  setTypes({ [typeId]: true });
                  setFrom(toISODate(b.start));
                  setTo(toISODate(b.end - DAY));
                })
              }
            />
          ) : (
            <BarSkeleton rows={LANES} />
          )}
        </Section>
      )}

      {/* ── Map · Network ── */}
      {(showMap || showNetwork) && (
        <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-3">
          {showMap && (
            <Section
              title="Where"
              height={ROW_C_H}
              className={showNetwork ? "" : "@3xl:col-span-2"}
              action={{ label: "Open Map", onClick: () => setView("map") }}
              note={`${plural(summary.located, "record")} with a location`}
            >
              <div className="relative flex-1 min-h-0 rounded-md overflow-hidden bg-vellum">
                <Suspense fallback={null}>
                  <OverviewMap
                    located={entities.filter((e) => e.geo)}
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
          )}
          {showNetwork && network && (
            <Section
              title="Connections"
              height={ROW_C_H}
              className={showMap ? "" : "@3xl:col-span-2"}
              action={{ label: "Open Network", onClick: () => setView("network") }}
              note={`${plural(network.communities.length, "community", "communities")} of linked records`}
            >
              <BarList
                label="Largest communities"
                rows={network.communities.slice(0, TOP_COMMUNITIES).map((c) => ({
                  key: String(c.id),
                  label: c.name,
                  sub: typeOf(c.typeId),
                  count: c.size,
                  action: `Open the Network on ${c.name}'s community, ${plural(c.size, "record")}`,
                  onClick: () => {
                    setCentre(c.id);
                    setView("network");
                  },
                }))}
              />
            </Section>
          )}
        </div>
      )}

      {/* ── Facets ── */}
      {ready && facets.length > 0 && (
        <div
          className={`grid grid-cols-1 gap-3 ${facets.length === 1 ? "" : facets.length === 2 ? "@3xl:grid-cols-2" : "@3xl:grid-cols-2 @6xl:grid-cols-3"}`}
        >
          {facets.map((f) => (
            <Section key={f.key} title={f.title} height={FACET_H} note={`${plural(f.distinct, "value")}`}>
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
            </Section>
          ))}
        </div>
      )}

      {/* ── Recently modified · Yours ── */}
      {(showRecent || showYours) && (
        <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-3">
          {showRecent && (
            <Section title="Recently modified" height={ROW_E_H} className={showYours ? "" : "@3xl:col-span-2"}>
              <RecordList
                records={recent.map((e) => ({ e, meta: formatDay(Date.parse(e.updatedAt!)) }))}
                typeOf={typeOf}
                onOpen={openRecord}
              />
            </Section>
          )}
          {showYours && (
            <Section title="Saved views and pins" height={ROW_E_H} className={showRecent ? "" : "@3xl:col-span-2"}>
              <ul className="flex flex-col min-h-0 overflow-y-auto -mx-2">
                {views.map((v) => {
                  const k = snapshotFilterCount(v.snapshot);
                  return (
                    <li key={v.id}>
                      <RowButton onClick={() => applySnapshot(v.snapshot)} label={`Open saved view ${v.name}`}>
                        <Bookmark size={13} aria-hidden className="shrink-0 text-ink-muted" />
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">{v.name}</span>
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
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{e.title}</span>
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

function Stat({ label, value, ltr = false }: { label: string; value: string | null; ltr?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="text-meta font-semibold uppercase tracking-wider text-ink-tertiary">{label}</dt>
      <dd className="h-6 flex items-center text-sm font-medium text-ink tabular-nums truncate">
        {value === null ? (
          <span aria-hidden className="block w-16 h-3 rounded-sm bg-vellum" />
        ) : (
          // Dates and ranges read left to right in an RTL page too.
          <span dir={ltr ? "ltr" : undefined}>{value}</span>
        )}
      </dd>
    </div>
  );
}

function Section({
  title,
  height,
  className = "",
  action,
  note,
  children,
}: {
  title: string;
  height: string;
  className?: string;
  action?: { label: string; onClick: () => void };
  note?: string;
  children: ReactNode;
}) {
  return (
    <section
      data-part="section"
      aria-label={title}
      className={`flex flex-col min-w-0 p-4 rounded-lg bg-paper ${className}`}
      style={{ height }}
    >
      <header className="shrink-0 flex items-center gap-3 h-6 mb-2">
        <SectionLabel as="h2" className="shrink-0">{title}</SectionLabel>
        {note && <span className="min-w-0 truncate text-xs text-ink-tertiary tabular-nums">{note}</span>}
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
    </section>
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
      className={`w-full flex items-center gap-2 ${tall ? "h-11" : "h-8"} px-2 rounded-md text-start hover:bg-warm transition-colors cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/40`}
    >
      {children}
    </button>
  );
}

function TemplateName({ type, wide = false }: { type: EntityType; wide?: boolean }) {
  return (
    <span className={`shrink-0 flex items-center gap-1.5 min-w-0 ${wide ? "max-w-full" : "max-w-[45%]"}`}>
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
  /** A second line's template (a community's dominant one). */
  sub?: EntityType;
  count: number;
  action: string;
  onClick: () => void;
}

/** A ranked list of horizontal bars, each drawn to scale from zero against
 *  `scaleTo` (the largest row when absent), its exact count beside it. One
 *  neutral hue: identity, where there is one, is the template dot. */
function BarList({
  rows,
  label,
  scaleTo,
  scroll = true,
}: {
  rows: BarRow[];
  label: string;
  scaleTo?: number;
  /** Scroll inside the card (false: the caller's box scrolls). */
  scroll?: boolean;
}) {
  const max = scaleTo ?? Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul aria-label={label} className={`flex flex-col -mx-2 ${scroll ? "min-h-0 overflow-y-auto" : ""}`}>
      {rows.map((r) => (
        <li key={r.key}>
          <RowButton onClick={r.onClick} label={r.action} tall={!!r.sub}>
            <span className="min-w-0 w-[42%] shrink-0 flex flex-col justify-center">
              <span className="min-w-0 flex items-center gap-1.5">
                {r.color && <span aria-hidden className="w-2 h-2 shrink-0 rounded-[2px]" style={{ backgroundColor: r.color }} />}
                <span
                  className={`min-w-0 truncate text-sm ${r.color ? "" : "text-ink"}`}
                  style={r.color ? { color: typeLabelColor(r.color) } : undefined}
                  title={r.label}
                >
                  {r.label}
                </span>
              </span>
              {r.sub && <TemplateName type={r.sub} wide />}
            </span>
            <span aria-hidden className="relative flex-1 min-w-0 h-1.5">
              <span
                className="absolute inset-y-0 start-0 rounded-full bg-carbon/60"
                style={{ width: `${Math.max(0.5, (r.count / max) * 100)}%` }}
              />
            </span>
            <span className="shrink-0 min-w-[3.5rem] text-end text-xs text-ink-secondary tabular-nums">{n(r.count)}</span>
          </RowButton>
        </li>
      ))}
    </ul>
  );
}

function BarSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-2 h-8">
          <span className="w-[42%] shrink-0 h-3 rounded-sm bg-vellum" />
          <span className="h-1.5 rounded-full bg-vellum" style={{ width: `${Math.max(8, 50 - i * 6)}%` }} />
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
    <ul className="flex flex-col min-h-0 overflow-y-auto -mx-2">
      {records.map(({ e, meta }) => (
        <li key={e.id}>
          <RowButton onClick={() => onOpen(e.id)} label={`Open ${e.title}`}>
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{e.title}</span>
            <TemplateName type={typeOf(e.typeId)} />
            <span className="shrink-0 w-[5.5rem] text-end text-xs text-ink-tertiary tabular-nums">{meta}</span>
          </RowButton>
        </li>
      ))}
    </ul>
  );
}

/** "1969 – 2025", or days for a span shorter than two years. */
function formatSpan(min: number, max: number): string {
  if (max - min < 2 * 365 * DAY) return min === max ? formatDay(min) : `${formatDay(min)} – ${formatDay(max)}`;
  const a = new Date(min).getUTCFullYear();
  const b = new Date(max).getUTCFullYear();
  return a === b ? String(a) : `${a} – ${b}`;
}

/* ── Timeline lanes ───────────────────────────────────────────────────── */

/** The Timeline view's Lanes, reduced: the six largest templates, one column
 *  per period across the whole range at the finest of month, quarter and year
 *  that fits, a dot's area its count on one scale. A lane opens Timeline on
 *  its template; a dot, on its template and period. */
function OverviewLanes({
  entities,
  typeOf,
  onLane,
  onCell,
}: {
  entities: Entity[];
  typeOf: (id: string) => EntityType;
  onLane: (typeId: string) => void;
  onCell: (typeId: string, b: TimeBucket) => void;
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
  const extent = useMemo(() => timeExtent(dated), [dated]);
  const labelW = w < 560 ? 96 : 176;
  const countW = 48;
  const plotW = Math.max(0, w - labelW - countW);

  const unit = useMemo((): TimeUnit => {
    if (!extent) return "year";
    const span = extent.max - extent.min;
    const per = (u: TimeUnit) => (u === "month" ? 30.44 : u === "quarter" ? 91.3 : 365.25) * DAY;
    const fits = (u: TimeUnit) => (span / per(u) + 1) * (u === "year" ? LANE_YEAR_MIN : LANE_COL_MIN) <= plotW;
    return (["month", "quarter", "year"] as TimeUnit[]).find(fits) ?? "year";
  }, [extent, plotW]);

  const { cols, lanes, max, more } = useMemo(() => {
    if (!extent || plotW <= 0) return { cols: [] as TimeBucket[], lanes: [], max: 1, more: 0 };
    const cols = bucketSeries(dated, unit, extent);
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
  }, [dated, unit, extent, plotW]);

  const colW = cols.length ? Math.max(unit === "year" ? LANE_YEAR_MIN : LANE_COL_MIN, plotW / cols.length) : 0;
  const rMax = Math.min(colW, LANE_H) / 2 - 1;
  const radius = (v: number) => Math.max(1.5, Math.sqrt(v / max) * rMax);

  const ticks = useMemo(() => {
    const steps = unit === "year" ? [1, 2, 5, 10, 20, 50] : unit === "quarter" ? [1, 2, 4] : [1, 2, 3, 6, 12];
    const k = steps.find((st) => colW * st >= LANE_LABEL_PITCH) ?? steps[steps.length - 1];
    const totalW = cols.length * colW;
    const half = LANE_LABEL_PITCH / 2 - 4;
    const out: { i: number; label: string; x: number }[] = [];
    cols.forEach((c, i) => {
      const d = new Date(c.start);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const rank = unit === "year" ? y : unit === "quarter" ? m / 3 : m;
      if (rank % k !== 0) return;
      const label = unit === "year" || m === 0 ? String(y) : unit === "quarter" ? `Q${m / 3 + 1}` : MONTH_SHORT[m];
      const x = Math.min(Math.max((i + 0.5) * colW, half), totalW - half);
      if (out.length && x - out[out.length - 1].x < LANE_LABEL_PITCH * 0.8) return;
      out.push({ i, label, x });
    });
    return out;
  }, [cols, colW, unit]);

  return (
    <div ref={hostRef} data-component="OverviewLanes" className="flex-1 min-h-0 flex flex-col">
      {cols.length > 0 && (
        <>
          {/* A range too long even for years scrolls here, never the page. */}
          <div dir="ltr" className="flex flex-col overflow-x-auto overflow-y-hidden">
            {lanes.map((lane) => {
              const type = typeOf(lane.typeId);
              return (
                <div key={lane.typeId} className="flex items-center" style={{ height: LANE_H }}>
                  <button
                    type="button"
                    onClick={() => onLane(lane.typeId)}
                    aria-label={`Open Timeline on ${type.name}, ${plural(lane.total, "dated record")}`}
                    className="shrink-0 h-full flex items-center gap-1.5 pe-2 rounded-md text-start hover:bg-warm cursor-pointer
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/40"
                    style={{ width: labelW + countW }}
                    title={type.name}
                  >
                    <span aria-hidden className="w-2 h-2 shrink-0 rounded-[2px] ms-1" style={{ backgroundColor: type.color }} />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium" style={{ color: typeLabelColor(type.color) }}>
                      {type.name}
                    </span>
                    <span className="shrink-0 text-end text-xs tabular-nums text-ink-tertiary" style={{ width: countW - 8 }}>
                      {n(lane.total)}
                    </span>
                  </button>
                  <div className="relative h-full flex" style={{ width: cols.length * colW }}>
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
                            onClick={() => onCell(lane.typeId, c)}
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
  name: string;
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
        .map((c) => ({
          id: c.id,
          name: getEntity(graph.ids[c.top])?.title ?? graph.ids[c.top],
          typeId: c.typeId,
          size: c.members.length,
        })),
    };
  }, [ready, stored, source, graph]);
}
