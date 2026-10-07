/** The Library's Display options, as data.
 *
 *  Every view mode draws different things, so every view mode offers different
 *  options — and until this file that fact lived as a run of `viewMode === …`
 *  booleans in `LibraryDisplayMenu`, each one repeated a second time inside the dot's
 *  "is anything off its default?" expression, and a third time in the table's
 *  column list. Three copies of one truth, and the dot was the copy that had
 *  already gone wrong once (hiding Thumbnail in Cards, then switching to
 *  Results, left it lit over a menu with no way to clear it).
 *
 *  So: ONE registry, keyed by mode. The menu renders it, the dot folds over it,
 *  the list table builds its columns from it. Adding an option is an entry here;
 *  nothing downstream branches on which mode it belongs to.
 *
 *  **Storage scope is part of the option, not of the caller.** `mode` options
 *  live under the mode you set them in — cards and list no longer share one
 *  info record, which is what made "Country" a single switch over a card
 *  subtitle and a table column that had nothing to do with each other. `shared`
 *  options are genuinely global (the time strip charts the whole result set
 *  whatever is drawing it). `external` names the few whose value is owned by
 *  another control entirely — sort is written by the toolbar and by the table
 *  headers too, with its own direction-toggle semantics, and pretending
 *  otherwise would put that logic in a data file.
 *
 *  **`visible` and `enabled` are different questions and the split is load-
 *  bearing.** `visible` reads CONTEXT only — the mode, the breakpoint, whether
 *  a query is running — so a section appears and disappears only on events that
 *  already replace the menu's contents. `enabled` reads VALUES, and dims in
 *  place: turning Thumbnail off must not make three sections vanish from under
 *  the pointer that is still travelling toward them. */

export type LibraryViewMode = "overview" | "cards" | "list" | "map" | "timeline" | "results" | "evidence" | "network";

export const LIBRARY_VIEW_MODES: LibraryViewMode[] = [
  "overview",
  "cards",
  "list",
  "map",
  "timeline",
  "results",
  "evidence",
  "network",
];

export type DisplayValue = string | boolean;
export type DisplayValues = Record<string, DisplayValue>;

/** Where an option's value is kept. See the file header. */
export type DisplayScope = "mode" | "shared" | "external";

export interface ToggleOption {
  id: string;
  label: string;
  /** Second line under the label, for options whose name isn't self-evident. */
  detail?: string;
  /** A boolean for a switch; a choice id when `choices` is set. */
  default: boolean | string;
  scope?: DisplayScope;
  /** Draw the row as a label with a small segmented control instead of a
   *  check: a switch that also has an Auto answer. */
  choices?: Choice[];
  /** Listed under this sub-heading (a list column under each template that
   *  carries it). The same id may appear under several; it is one value. */
  group?: string;
}

export interface Choice {
  id: string;
  label: string;
  detail?: string;
}

export interface ChoiceOption {
  id: string;
  default: string;
  choices: Choice[];
  scope?: DisplayScope;
  /** Keep one answer per value of another option: the stored key becomes
   *  `${id}:${value}` (Columns is kept per thumbnail frame, since a portrait
   *  hang wants more, narrower columns than a landscape one). */
  keyedBy?: { id: string; fallback: string; values: string[] };
  /** Draw the choices as one segmented row instead of a list. For short,
   *  ordered answers (counts), where a row per choice would be mostly air. */
  layout?: "segmented";
}

/** Where a choice option's answer is stored, given the current values. */
export function storageId(option: ChoiceOption, values: DisplayValues): string {
  if (!option.keyedBy) return option.id;
  const k = option.keyedBy;
  return `${option.id}:${(values[k.id] as string | undefined) ?? k.fallback}`;
}

/** What the menu knows that the registry can't: the viewport, the query, and
 *  the columns the current corpus can actually offer. */
export interface DisplayContext {
  isMobile: boolean;
  /** The toolbar's Sort select has stepped aside — on a phone, or because the
   *  Library pane is too narrow for it (a drawer beside a tablet-width
   *  window) — so Sort lives in this menu instead. */
  sortInMenu: boolean;
  /** The toolbar's Language select has folded away; the menu carries it. */
  languageInMenu: boolean;
  /** The toolbar's View select has folded away (the narrowest desktop pane);
   *  the menu carries it, first. */
  viewInMenu: boolean;
  /** The views this collection offers (Evidence only where it has claims). */
  viewChoices?: Choice[];
  hasQuery: boolean;
  /** The sort keys on offer: the fixed ones and the templates'
   *  `prioritySorting` properties. */
  sortChoices?: Choice[];
  /** The list's column toggles — built-ins plus one per metadata property the
   *  corpus carries. Supplied by `components/library/listColumns`, so a new
   *  column is one entry there and appears here, in the menu and in the table
   *  without a second edit. */
  listColumns: ToggleOption[];
  /** The Network view's type switches, one per relationship type the
   *  collection carries (`networkTypeOptionsAtom`). Empty outside that view. */
  networkTypes: ToggleOption[];
  /** The collection has an evidence layer the Network view can hide (Nepal). */
  networkEvidence: boolean;
  /** The collection knows where the shots came from, so the Map can draw a
   *  computed bearing from each camera to it (Las Vegas). */
  mapBearings: boolean;
}

interface SectionBase {
  id: string;
  /** The SectionLabel above the section. */
  label: string;
  /** Structural: context only, never values. */
  visible?: (ctx: DisplayContext) => boolean;
  /** Dims the section's controls in place. Values only, never context. */
  enabled?: (values: DisplayValues) => boolean;
  /** Draw a hairline above this section. */
  separator?: boolean;
  /** Said under a segmented section while `enabled` is false, so a dimmed
   *  control names what turns it back on. */
  disabledReason?: string;
}

export type DisplaySection =
  | (SectionBase & {
      kind: "toggles";
      options: ToggleOption[] | ((ctx: DisplayContext) => ToggleOption[]);
    })
  | (SectionBase & { kind: "choice"; option: ChoiceOption });

// ── The shared sections ──────────────────────────────────────────────────────

/** The time strip filters by date and charts the whole result set, so it is
 *  useful under every layout — not just the map and the timeline it started
 *  under. One switch, shared. Off by default on phones, where it took about
 *  110px of every Library screen; the switch stays here. */
const CHART: DisplaySection = {
  id: "chart",
  label: "Chart",
  kind: "toggles",
  options: (ctx) => [{ id: "timeStrip", label: "Time strip", default: !ctx.isMobile, scope: "shared" }],
};

/** The Library's views, once: the toolbar's View select and this menu's View
 *  section read this list. Evidence is listed only where the collection holds
 *  claim evidence; Adv. Search is last and always listed, and its value stays
 *  "results". */
export const LIBRARY_VIEWS: Choice[] = [
  { id: "cards", label: "Cards" },
  { id: "list", label: "List" },
  { id: "map", label: "Map" },
  { id: "timeline", label: "Timeline" },
  { id: "evidence", label: "Evidence" },
  { id: "network", label: "Network" },
  { id: "results", label: "Adv. Search" },
];
/** The collection's landing page. Listed first, and only where it is offered
 *  (`libraryOverviewOfferedAtom`): the toolbar select and this menu's View
 *  section both put it ahead of `LIBRARY_VIEWS`. */
export const OVERVIEW_VIEW: Choice = { id: "overview", label: "Overview" };

/** The view, while the toolbar's View select has folded into this menu (see the
 *  masthead fold in `LibraryView`). First, since every section under it
 *  depends on it. `external`: the toolbar Select writes the same atom. */
const VIEW: DisplaySection = {
  id: "view",
  label: "View",
  kind: "choice",
  visible: (ctx) => ctx.viewInMenu,
  option: { id: "view", scope: "external", default: "cards", choices: LIBRARY_VIEWS },
};

/** The sort keys, once — the toolbar Select reads this list and so does the
 *  phone's Display section, which is the only reason the two can't drift. */
export const LIBRARY_SORTS: Choice[] = [
  // Only offered while a query is active (see `librarySortAtom`); the toolbar
  // drops it with no query.
  { id: "relevance", label: "Relevance" },
  { id: "recent", label: "Date added" },
  { id: "title", label: "Title" },
  { id: "connections", label: "Relationships" },
  { id: "type", label: "Template" },
  { id: "country", label: "Country" },
];

/** Sort lives here on a phone — the toolbar gives its width to the view
 *  switcher, which matters more than a sort key you set once. `external`: the
 *  toolbar Select and the table's own column headers write this too, and a
 *  repeat pick flips the direction rather than re-picking the key. */
const SORT: DisplaySection = {
  id: "sort",
  label: "Sort by",
  kind: "choice",
  visible: (ctx) => ctx.sortInMenu,
  separator: true,
  option: { id: "sort", scope: "external", default: "recent", choices: LIBRARY_SORTS },
};

/** The reading language, while the toolbar's own select has folded away. Same
 *  `external` binding as Sort: the toolbar Select writes the same atom. */
const LANGUAGE: DisplaySection = {
  id: "language",
  label: "Language",
  kind: "choice",
  visible: (ctx) => ctx.languageInMenu,
  separator: true,
  option: {
    id: "language",
    scope: "external",
    default: "EN",
    choices: [
      { id: "EN", label: "English" },
      { id: "ES", label: "Español" },
      { id: "FR", label: "Français" },
      { id: "AR", label: "العربية" },
    ],
  },
};

/** Thumbnail: Auto shows thumbnails when at least half of the current results
 *  can draw a preview, an image or a document's first page (`previewCount` in
 *  atoms/library.ts). Whenever thumbnails are drawn, by On or by Auto, every
 *  card keeps the slot, with a `QuietMark` where there is nothing to draw. The menu
 *  says what Auto resolved to and the count behind it. Stored `true` / `false`
 *  from the old switch read as On / Off. */
export type ThumbMode = "auto" | "on" | "off";
export const DEFAULT_THUMB_MODE: ThumbMode = "auto";

/** What a CARD carries.
 *
 *  Country and Date are not here: a card draws neither, they are list columns.
 *  Metadata is a switch beside Thumbnail and Relationships so that hiding every
 *  property is one visible action; how many properties a card draws is the
 *  count below, which dims while this is off. */
const CARD_INFO: DisplaySection = {
  id: "info",
  label: "Show information",
  kind: "toggles",
  separator: true,
  options: [
    {
      id: "preview",
      label: "Thumbnail",
      default: DEFAULT_THUMB_MODE,
      choices: [
        { id: "auto", label: "Auto" },
        { id: "on", label: "On" },
        { id: "off", label: "Off" },
      ],
    },
    { id: "connections", label: "Relationships", default: true },
    { id: "metadata", label: "Metadata", default: true },
  ],
};

/** How many properties a card draws while Metadata is on. A template's
 *  property count is not the app's to cap; the reader picks. There is no
 *  "None": the Metadata switch above is the off state. */
const CARD_FIELDS: DisplaySection = {
  id: "cardFields",
  label: "Metadata properties",
  kind: "choice",
  enabled: (v) => v.metadata !== false,
  disabledReason: "Metadata is off",
  option: {
    id: "cardFields",
    default: "all",
    layout: "segmented",
    choices: [
      { id: "3", label: "First 3" },
      { id: "5", label: "First 5" },
      { id: "all", label: "All", detail: "Every property the template fills" },
    ],
  },
};

/** How many columns the grid draws. Auto is the readable minimum (3 in a
 *  1400px pane); a number is a ceiling the grid keeps while each card stays
 *  readable, and drops below when the pane is too narrow (the menu says what
 *  is in effect). Kept per frame. In landscape, thumbnail size sizes the
 *  picture only; in portrait (and side cards) it steps Auto's minimum width,
 *  because there the picture's width is the column's. */
export const CARD_COLUMNS_CHOICES = ["auto", "2", "3", "4", "5", "6"] as const;
/** Columns when the reader has not picked any: 3 in the Drawer layout, where
 *  the drawer takes a third of the window and Auto gave two wide cards; Auto in
 *  Full width and Split, which size the grid to their own pane. */
export const cardColumnsDefault = (layout: string): string => (layout === "drawer" ? "3" : "auto");
const CARD_COLUMNS: DisplaySection = {
  id: "cardCols",
  label: "Columns",
  kind: "choice",
  separator: true,
  option: {
    id: "cardCols",
    default: "auto",
    layout: "segmented",
    keyedBy: { id: "thumbFrame", fallback: "landscape", values: ["landscape", "portrait"] },
    choices: CARD_COLUMNS_CHOICES.map((c) => ({ id: c, label: c === "auto" ? "Auto" : c })),
  },
};

/** Not a stored option: whether thumbnails are drawn once Auto is resolved
 *  against the current results. The menu adds it to the values the `enabled`
 *  predicates read, since the stored "auto" alone cannot answer that. */
export const THUMBS_SHOWN = "thumbnailsShown";

/** Size, then frame, then fit — the order the questions come in: how big, what
 *  shape, how the picture sits in it. All three are dead while the Thumbnail
 *  toggle resolves to off, and they say so by dimming rather than by leaving. */
const thumbSections = (): DisplaySection[] => {
  const enabled = (v: DisplayValues) => v[THUMBS_SHOWN] !== false;
  return [
    {
      id: "thumbSize",
      label: "Thumbnail size",
      kind: "choice",
      separator: true,
      enabled,
      option: {
        id: "thumbSize",
        default: "s",
        choices: [
          { id: "s", label: "Small" },
          { id: "m", label: "Medium" },
          { id: "l", label: "Large" },
        ],
      },
    },
    {
      id: "thumbFrame",
      label: "Thumbnail frame",
      kind: "choice",
      enabled,
      option: {
        id: "thumbFrame",
        default: "landscape",
        choices: [
          { id: "landscape", label: "Landscape", detail: "A wide band across the card" },
          {
            id: "portrait",
            label: "Portrait",
            detail: "3:4 cards in narrower columns — a gallery hang",
          },
        ],
      },
    },
    {
      id: "thumbFit",
      label: "Image fit",
      kind: "choice",
      enabled,
      option: {
        id: "thumbFit",
        default: "auto",
        choices: [
          { id: "auto", label: "Auto", detail: "Ratio decides — wide fills, tall is matted" },
          { id: "cover", label: "Cover", detail: "Fill the whole slot edge to edge, crop the image" },
          { id: "contain", label: "Contain", detail: "Whole image on a quiet mat" },
        ],
      },
    },
  ];
};

// ── The registry ─────────────────────────────────────────────────────────────

export const LIBRARY_DISPLAY: Record<LibraryViewMode, DisplaySection[]> = {
  cards: [
    VIEW,
    CHART,
    SORT,
    LANGUAGE,
    CARD_INFO,
    CARD_FIELDS,
    {
      id: "cardLayout",
      label: "Card layout",
      kind: "choice",
      separator: true,
      enabled: (v) => v[THUMBS_SHOWN] !== false,
      option: {
        id: "cardLayout",
        default: "stacked",
        choices: [
          { id: "stacked", label: "Stacked", detail: "Preview above the text" },
          { id: "side", label: "Side", detail: "Preview beside the text, in wider columns" },
        ],
      },
    },
    CARD_COLUMNS,
    ...thumbSections(),
  ],

  /** The list's options are its COLUMNS, one per track the table can draw —
   *  including the corpus's own metadata properties, which no other view can
   *  offer because no other view has somewhere to put them. Density is here for
   *  the same reason: rows are the only thing in the Library with a height you
   *  might want back. */
  list: [
    VIEW,
    CHART,
    SORT,
    LANGUAGE,
    {
      id: "columns",
      label: "Columns",
      kind: "toggles",
      separator: true,
      options: (ctx) => ctx.listColumns,
    },
    {
      id: "density",
      label: "Density",
      kind: "choice",
      separator: true,
      option: {
        id: "density",
        default: "comfortable",
        choices: [
          { id: "comfortable", label: "Comfortable", detail: "Room around every row" },
          { id: "compact", label: "Compact", detail: "More rows per screen; same type size" },
        ],
      },
    },
  ],

  timeline: [
    VIEW,
    CHART,
    SORT,
    LANGUAGE,
    {
      id: "timelineLayout",
      label: "Timeline layout",
      kind: "choice",
      separator: true,
      option: {
        id: "timelineLayout",
        default: "rail",
        choices: [
          { id: "rail", label: "Rail", detail: "Periods on a track, click to filter" },
          { id: "density", label: "Density", detail: "Volume per period, click to filter" },
          { id: "spine", label: "Spine", detail: "Every entity at its exact date" },
          { id: "lanes", label: "Lanes", detail: "Template × period grid" },
        ],
      },
    },
    CARD_INFO,
    CARD_FIELDS,
    ...thumbSections(),
  ],

  results: [
    VIEW,
    CHART,
    SORT,
    LANGUAGE,
    {
      id: "resultsLayout",
      label: "Adv. Search layout",
      kind: "choice",
      separator: true,
      option: {
        id: "resultsLayout",
        default: "grouped",
        choices: [
          { id: "grouped", label: "Grouped", detail: "One card per entity, fields beside pages" },
          { id: "tree", label: "Tree", detail: "Entity → field → snippets, collapsible" },
          { id: "passages", label: "Passages", detail: "Every passage, ranked; entity secondary" },
          { id: "spine", label: "Spine", detail: "Best passage at its date on a time axis" },
        ],
      },
    },
  ],

  /** The map draws neither cards nor rows, so it offers the chart and the phone's
   *  sort and nothing else. An empty-feeling menu is the honest answer; a menu
   *  full of controls that act on nothing is not. */
  map: [
    VIEW,
    CHART,
    SORT,
    LANGUAGE,
    {
      id: "mapLayers",
      label: "Layers",
      kind: "toggles",
      separator: true,
      visible: (ctx) => ctx.mapBearings,
      options: [
        {
          id: "bearings",
          label: "Bearing to source",
          detail: "Computed: a line from each camera position to where the shots were fired from",
          default: false,
        },
      ],
    },
  ],

  /** Claims against their sources: the sort orders the claims; nothing else
   *  here has a card or a column to configure. */
  evidence: [VIEW, CHART, SORT, LANGUAGE],

  /** The whole collection as a graph. Its options decide which edges and
   *  records are drawn; none of them moves a node (the layout is fixed per
   *  collection). Sort orders nothing here, so it is not offered. */
  /** The collection's landing page: it draws the whole collection, so only
   *  the content language (its property values' labels) applies. */
  overview: [VIEW, LANGUAGE],

  network: [
    VIEW,
    CHART,
    LANGUAGE,
    {
      id: "hubEdges",
      label: "Hub edges",
      kind: "choice",
      separator: true,
      option: {
        id: "hubEdges",
        default: "faint",
        choices: [
          { id: "faint", label: "Faint", detail: "Links to the best-connected records, drawn light" },
          { id: "full", label: "Full" },
          { id: "off", label: "Hidden" },
        ],
      },
    },
    {
      id: "layers",
      label: "Layers",
      kind: "toggles",
      separator: true,
      visible: (ctx) => ctx.networkEvidence,
      options: [{ id: "evidence", label: "Evidence", detail: "Sources, claims and media, and their links", default: true }],
    },
    {
      id: "networkTypes",
      label: "Relationship types",
      kind: "toggles",
      separator: true,
      options: (ctx) => ctx.networkTypes,
    },
  ],
};

// ── Reading the registry ─────────────────────────────────────────────────────

/** The sections a mode actually shows, in order. */
export function sectionsFor(mode: LibraryViewMode, ctx: DisplayContext): DisplaySection[] {
  return LIBRARY_DISPLAY[mode].filter((s) => s.visible?.(ctx) ?? true);
}

/** A section's options, resolved against the context. */
export function sectionOptions(section: DisplaySection, ctx: DisplayContext): ToggleOption[] {
  if (section.kind !== "toggles") return [];
  return typeof section.options === "function" ? section.options(ctx) : section.options;
}

/** Every option a mode declares, paired with its scope — the one enumeration
 *  the defaults, the dot and the reset all fold over. */
export function optionsFor(
  mode: LibraryViewMode,
  ctx: DisplayContext,
): { id: string; scope: DisplayScope; fallback: DisplayValue }[] {
  const out: { id: string; scope: DisplayScope; fallback: DisplayValue }[] = [];
  for (const section of sectionsFor(mode, ctx)) {
    if (section.kind === "choice") {
      const o = section.option;
      for (const id of o.keyedBy ? o.keyedBy.values.map((v) => `${o.id}:${v}`) : [o.id])
        out.push({ id, scope: o.scope ?? "mode", fallback: o.default });
    } else {
      for (const o of sectionOptions(section, ctx)) {
        out.push({ id: o.id, scope: o.scope ?? "mode", fallback: o.default });
      }
    }
  }
  return out;
}

/** The default value of one option in one mode, whatever section it sits in.
 *  Consumers ask this rather than hard-coding a guess — comparing against a
 *  hard-coded guess is what lit the Relationships dot on every fresh panel. */
export function defaultOf(
  mode: LibraryViewMode,
  id: string,
  ctx: DisplayContext,
): DisplayValue | undefined {
  return optionsFor(mode, ctx).find((o) => o.id === id)?.fallback;
}
