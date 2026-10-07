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
const HEADER_H = "10.5rem";
const ROW_A_H = "20rem";
const LANES_H = "16.5rem";
/** Map and Network, the second band: at 1440 × 900 it sits above the fold. */
const ROW_C_H = "15rem";
const FACET_H = "16rem";
const ROW_E_H = "14rem";

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

  const span = summary.extent ? formatSpan(summary.extent.min, summary.extent.max) : null;

  return (
    <div data-component="LibraryOverview" aria-busy={loading} className="@container flex flex-col gap-2 pb-3">
      {/* ── Header ── */}
      {/* The collection's title page: its name, what it is at a reading
          measure, and the key figures. Fixed height from two columns up;
          narrower, the figures may wrap, the same while loading as loaded. */}
      <header
        data-part="header"
        className="flex flex-col justify-between gap-4 pt-2 pb-3 @3xl:h-[var(--overview-header-h)]"
        style={{ "--overview-header-h": HEADER_H } as React.CSSProperties}
      >
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink leading-tight truncate">{settings.name || "Untitled collection"}</h1>
          {settings.description && (
            <p className="mt-2 max-w-[40rem] text-sm text-ink-secondary leading-relaxed line-clamp-3 @xl:line-clamp-2">{settings.description}</p>
          )}
        </div>
        <dl data-part="stats" className="grid grid-cols-2 gap-x-4 gap-y-3 @xl:flex @xl:flex-wrap @xl:items-end @xl:gap-x-10 @3xl:h-[3.25rem] @3xl:overflow-hidden">
          <Stat label="Records" value={ready ? n(total) : null} />
          {(!ready || span) && <Stat label="Dates" value={ready ? span : null} ltr />}
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

      {/* ── What's in it · Contains, Language ── */}
      <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-2">
        <Section
          title="What's in it"
          height={ROW_A_H}
          className={ready && !showContent ? "@3xl:col-span-2" : ""}
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
        {(!ready || showContent) && (
          // Two sections side by side, each the band's height (Nepal lists
          // five kinds of content; stacked, Language had no room).
          <div
            className={`grid grid-cols-1 gap-2 min-w-0 ${(!ready || (showContains && showLanguages)) ? "@xl:grid-cols-2" : ""} @3xl:grid-rows-1 @3xl:h-[var(--overview-row-a-h)]`}
            style={{ "--overview-row-a-h": ROW_A_H } as React.CSSProperties}
          >
            {(!ready || showContains) && (
              <Section title="Contains" note={ready ? `of ${plural(total, "record")}` : undefined}>
                {ready ? (
                  <BarList
                    label="Records by what they contain"
                    scaleTo={total}
                    narrow
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
              </Section>
            )}
            {(!ready || showLanguages) && (
              <Section title="Language" note={ready ? `of ${plural(total, "record")}` : undefined}>
                {ready ? (
                  <BarList
                    label="Records by the language of their content"
                    scaleTo={total}
                    narrow
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
              </Section>
            )}
          </div>
        )}
      </div>

      {/* ── Map · Network ── */}
      {(showMap || showNetwork) && (
        <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-2">
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

      {/* ── Timeline ── */}
      {showLanes && (
        <Section
          title="Over time"
          // A phone stacks each lane's name over its dots, so the band grows.
          className="@3xl:h-[var(--overview-lanes-h)]"
          style={{ "--overview-lanes-h": LANES_H } as React.CSSProperties}
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

      {/* ── Facets ── */}
      {ready && facets.length > 0 && (
        <div
          className={`grid grid-cols-1 gap-2 ${facets.length === 1 ? "" : facets.length === 2 ? "@3xl:grid-cols-2" : "@3xl:grid-cols-2 @6xl:grid-cols-3 [&>*:nth-child(3)]:@3xl:col-span-2 [&>*:nth-child(3)]:@6xl:col-span-1"}`}
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
        <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-2">
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
    <div className="flex flex-col gap-1 min-w-0">
      <dt className="text-meta font-semibold uppercase tracking-wider text-ink-tertiary">{label}</dt>
      <dd className="h-7 flex items-center text-xl font-semibold text-ink tabular-nums truncate">
        {value === null ? (
          <span aria-hidden className="block w-16 h-4 rounded-sm bg-vellum" />
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
  style,
  action,
  note,
  children,
}: {
  title: string;
  /** A fixed height; without one the section takes what its box gives it. */
  height?: string;
  className?: string;
  style?: React.CSSProperties;
  action?: { label: string; onClick: () => void };
  note?: string;
  children: ReactNode;
}) {
  return (
    <section
      data-part="section"
      aria-label={title}
      className={`flex flex-col min-w-0 min-h-0 p-4 rounded-lg bg-paper ${className}`}
      style={{ height, ...style }}
    >
      <header className="shrink-0 flex items-center gap-2 h-6 mb-2">
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
      className={`group w-full flex items-center gap-3 ${tall ? "h-11" : "h-7"} px-2 rounded-md text-start hover:bg-warm transition-colors cursor-pointer
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
 *  `scaleTo` (the largest row when absent), its exact count in a fixed
 *  column at the end. One quiet ink tint for every bar: identity, where
 *  there is one, is the template dot, and the label stays ink. */
function BarList({
  rows,
  label,
  scaleTo,
  more,
  narrow = false,
}: {
  rows: BarRow[];
  label: string;
  scaleTo?: number;
  /** A last row for what the list leaves out ("4 more templates in Cards"). */
  more?: { label: string; onClick: () => void };
  /** A half-width card: the label takes half the row, the bar the rest. */
  narrow?: boolean;
}) {
  const max = scaleTo ?? Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul aria-label={label} className="flex flex-col -mx-2 min-h-0 overflow-y-auto">
      {rows.map((r) => (
        <li key={r.key}>
          <RowButton onClick={r.onClick} label={r.action} tall={!!r.sub}>
            {/* A phone gives the label most of the row; the bar stays a bar. */}
            <span className={`min-w-0 ${narrow ? "w-3/5 @xl:w-1/2" : "w-3/5 @xl:w-[42%]"} shrink-0 flex flex-col justify-center`}>
              <span className="min-w-0 flex items-center gap-1.5">
                {r.color && <span aria-hidden className="w-2 h-2 shrink-0 rounded-[2px]" style={{ backgroundColor: r.color }} />}
                {/* A truncated name keeps its whole text in the tooltip. */}
                <span className="min-w-0 truncate text-sm text-ink" title={r.label}>
                  {r.label}
                </span>
              </span>
              {r.sub && <TemplateName type={r.sub} wide />}
            </span>
            <span aria-hidden className="relative flex-1 min-w-0 h-1.5">
              <span
                className="absolute inset-y-0 start-0 rounded-full bg-ink/15 group-hover:bg-ink/30 transition-colors"
                style={{ width: `${Math.max(0.5, (r.count / max) * 100)}%` }}
              />
            </span>
            <span className="shrink-0 w-14 text-end text-xs text-ink-secondary tabular-nums">{n(r.count)}</span>
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
