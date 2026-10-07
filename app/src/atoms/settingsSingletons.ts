import { atom } from "jotai";
import type { Corpus } from "../data/entityChanges";
import { entityTypes } from "../data/entities";
import { corpusTypes } from "./dataSource";
import {
  cejilCollection,
  cejilFilterGroups,
  cejilFilterRows,
} from "../data/cejil/settingsAdapt";
import { createSettingsSingleton } from "./settingsCollection";
import { DATE_PATTERNS, type DatePattern } from "../utils/dateFormat";

/** The settings domains that are one value per corpus: Collection, Global
 *  CSS & JS and Filters. Each page edits a draft of its value and saves it
 *  here; readers outside Settings read the value, never the seed. */

const isString = (v: unknown) => typeof v === "string";
const arrayOf = (check: (x: Record<string, unknown>) => boolean) => (v: unknown) =>
  Array.isArray(v) && v.every((x) => !!x && typeof x === "object" && check(x as Record<string, unknown>));

/* ── Collection ─────────────────────────────────────────────────────────── */

/** Uwazi offers cards, table and map. Network is the prototype's own: the
 *  whole collection as a graph (the Library's Network view). */
export type DefaultLibraryView = "cards" | "table" | "map" | "network";
/** Uwazi's option order: Cards, Map, Table. */
export const DEFAULT_VIEWS: DefaultLibraryView[] = ["cards", "map", "table", "network"];
export type MapProvider = "mapbox" | "google";
export type MapLayer = "Dark" | "Streets" | "Satellite" | "Hybrid";
/** Popover order. */
export const MAP_LAYERS: MapLayer[] = ["Dark", "Streets", "Satellite", "Hybrid"];
export interface MapPoint {
  lat: number;
  lon: number;
}

/** Settings › Collection, one value per corpus. The Uwazi key each field
 *  stands for is noted where the name differs. */
export type CollectionSettings = CollectionFields & Record<string, unknown>;
export interface CollectionFields {
  /** `site_name` */
  name: string;
  /** What the collection holds, in a sentence or two: the Library's Overview
   *  prints it under the name. The prototype's own; Uwazi has no such field. */
  description: string;
  /** Upload id of the favicon; "" = the Uwazi logo. Uwazi stores the URL. */
  favicon: string;
  /** `home_page`; "" = the library */
  landing: string;
  /** `defaultLibraryView` */
  defaultView: DefaultLibraryView;
  dateFormat: DatePattern;
  /** Uwazi stores the inverse, `private`. */
  publicInstance: boolean;
  /** `filterUnauthorizedRelated` */
  hideRestrictedRelationships: boolean;
  /** `cookiepolicy` */
  cookiePolicy: boolean;
  /** `allowcustomJS` */
  globalJs: boolean;
  /** `analyticsTrackingId` */
  googleAnalytics: string;
  /** `matomoConfig`, a JSON string */
  matomo: string;
  senderEmail: string;
  contactEmail: string;
  /** `publicFormDestination` */
  publicFormSubmitUrl: string;
  /** `tilesProvider` */
  mapProvider: MapProvider;
  mapApiKey: string;
  mapLayers: MapLayer[];
  /** `mapStartingPoint`; null = none stored */
  mapStartingPoint: MapPoint | null;
}

/** Each corpus's own description, for the Library's Overview. */
const COLLECTION_DESCRIPTIONS: Record<Corpus, string> = {
  mock: "Cases, judgments, hearings and the people and places they name, from the Inter-American human rights system. A sample collection for trying Uwazi.",
  cejil: "CEJIL’s archive of the Inter-American human rights system: cases, judgments, provisional measures, hearings and the documents behind them.",
  artworks: "Paintings by well-known artists, each with its image, its artist and the artist’s period and nationality.",
  travesia: "A fictional collection in the shape of a migrant shelter network's casework: people on the move, their movements, detentions, disappearances and the alerts raised about them.",
  nepal: "The protests in Nepal from 2024 to 2026: events, the people and organisations involved, casualties, official actions, and the sources and claims behind each.",
};

/** Each corpus's own name, as the navbar's collection switcher reads it. */
const COLLECTION_NAMES: Record<Corpus, string> = {
  mock: "Inter-American Human Rights Archive",
  cejil: cejilCollection.name,
  artworks: "Best Artworks",
  travesia: "Red Travesía",
  nepal: "Nepal protests 2024–2026",
};

export const collectionSettings = createSettingsSingleton<CollectionSettings>({
  name: "collection",
  seedOf: (corpus: Corpus) => ({
    name: COLLECTION_NAMES[corpus],
    description: COLLECTION_DESCRIPTIONS[corpus],
    favicon: "",
    landing: "",
    defaultView: corpus === "cejil" && DEFAULT_VIEWS.includes(cejilCollection.defaultView as DefaultLibraryView)
      ? (cejilCollection.defaultView as DefaultLibraryView)
      : "cards",
    dateFormat:
      corpus === "cejil" && DATE_PATTERNS.includes(cejilCollection.dateFormat as DatePattern)
        ? (cejilCollection.dateFormat as DatePattern)
        : "yyyy/MM/dd",
    publicInstance: false,
    hideRestrictedRelationships: false,
    cookiePolicy: false,
    globalJs: false,
    googleAnalytics: "",
    matomo: "",
    senderEmail: "",
    contactEmail: "",
    publicFormSubmitUrl: "",
    mapProvider: "mapbox",
    mapApiKey: "",
    // What a fresh Uwazi install stores.
    mapLayers: ["Streets", "Hybrid", "Satellite"],
    mapStartingPoint: null,
  }),
  isField: {
    defaultView: (v) => DEFAULT_VIEWS.includes(v as DefaultLibraryView),
    dateFormat: (v) => DATE_PATTERNS.includes(v as DatePattern),
    mapProvider: (v) => v === "mapbox" || v === "google",
    mapLayers: (v) => Array.isArray(v) && v.length > 0 && v.every((l) => MAP_LAYERS.includes(l as MapLayer)),
    // null is stored for "no point"; the seed's kind check would refuse an object.
    mapStartingPoint: (v) =>
      v === null ||
      (!!v && typeof v === "object" && Number.isFinite((v as MapPoint).lat) && Number.isFinite((v as MapPoint).lon)),
  },
});

/** The active corpus's date pattern, for components that print dates. */
export const dateFormatAtom = atom((get) => get(collectionSettings.valueAtom).dateFormat);

/* ── Global CSS & JS ────────────────────────────────────────────────────── */

const SAMPLE_CSS = `/* Global CSS — applied across the public collection */
.home-banner {
  background: var(--bg-parchment);
}`;

const SAMPLE_JS = `// Global JS — runs on every public page
console.log('Collection loaded');`;

export interface CustomisationSettings extends Record<string, unknown> {
  css: string;
  js: string;
}

export const customisationSettings = createSettingsSingleton<CustomisationSettings>({
  name: "customisation",
  seedOf: () => ({ css: SAMPLE_CSS, js: SAMPLE_JS }),
});

/* ── Filters ────────────────────────────────────────────────────────────── */

export interface FilterGroup {
  id: string;
  name: string;
}
export interface FilterRow {
  templateId: string;
  active: boolean;
  /** "" = ungrouped */
  groupId: string;
}
export interface FilterSettings extends Record<string, unknown> {
  groups: FilterGroup[];
  rows: FilterRow[];
}

export const filterSettings = createSettingsSingleton<FilterSettings>({
  name: "filters",
  seedOf: (corpus: Corpus) =>
    corpus === "cejil"
      ? { groups: cejilFilterGroups, rows: cejilFilterRows }
      : {
          // Every template of the corpus, shown: a filter list with nothing
          // hidden is Uwazi's default (an empty `settings.filters` lists all).
          groups: [],
          rows: corpusTypes(corpus, entityTypes).map((t) => ({ templateId: t.id, active: true, groupId: "" })),
        },
  isField: {
    groups: arrayOf((g) => isString(g.id) && isString(g.name)),
    rows: arrayOf((r) => isString(r.templateId) && typeof r.active === "boolean" && isString(r.groupId)),
  },
});

/** What the Library's Template facet shows, from the saved Filters: active
 *  templates only, in the saved order, nested in their groups. A group sits
 *  where its first member does; an empty group is not shown. With no template
 *  ticked, every template is listed: in Uwazi an empty `settings.filters`
 *  means "show them all". */
export type TemplateFacetNode =
  | { kind: "template"; id: string }
  | { kind: "group"; id: string; name: string; ids: string[] };

export const libraryTemplateFacetsAtom = atom<TemplateFacetNode[]>((get) => {
  const { groups, rows: saved } = get(filterSettings.valueAtom);
  const rows = saved.some((r) => r.active) ? saved : saved.map((r) => ({ ...r, active: true }));
  const names = new Map(groups.map((g) => [g.id, g.name]));
  const out: TemplateFacetNode[] = [];
  const placed = new Map<string, { kind: "group"; id: string; name: string; ids: string[] }>();
  for (const r of rows) {
    if (!r.active) continue;
    if (!r.groupId || !names.has(r.groupId)) {
      out.push({ kind: "template", id: r.templateId });
      continue;
    }
    let g = placed.get(r.groupId);
    if (!g) {
      g = { kind: "group", id: r.groupId, name: names.get(r.groupId) || "Untitled group", ids: [] };
      placed.set(r.groupId, g);
      out.push(g);
    }
    g.ids.push(r.templateId);
  }
  return out;
});
