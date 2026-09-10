/** The Library's Display options, as data.
 *
 *  Every view mode draws different things, so every view mode offers different
 *  options — and until this file that fact lived as a run of `viewMode === …`
 *  booleans in `DisplayMenu`, each one repeated a second time inside the dot's
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

export type LibraryViewMode = "cards" | "list" | "map" | "timeline" | "results";

export const LIBRARY_VIEW_MODES: LibraryViewMode[] = [
  "cards",
  "list",
  "map",
  "timeline",
  "results",
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
  default: boolean;
  scope?: DisplayScope;
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
}

/** What the menu knows that the registry can't: the viewport, the query, and
 *  the columns the current corpus can actually offer. */
export interface DisplayContext {
  isMobile: boolean;
  hasQuery: boolean;
  /** The list's column toggles — built-ins plus one per metadata property the
   *  corpus carries. Supplied by `components/library/listColumns`, so a new
   *  column is one entry there and appears here, in the menu and in the table
   *  without a second edit. */
  listColumns: ToggleOption[];
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
 *  under. One switch, shared. */
const CHART: DisplaySection = {
  id: "chart",
  label: "Chart",
  kind: "toggles",
  options: [{ id: "timeStrip", label: "Time strip", default: true, scope: "shared" }],
};

/** The sort keys, once — the toolbar Select reads this list and so does the
 *  phone's Display section, which is the only reason the two can't drift. */
export const LIBRARY_SORTS: Choice[] = [
  { id: "recent", label: "Date added" },
  { id: "title", label: "Title" },
  { id: "connections", label: "Connections" },
  { id: "type", label: "Type" },
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
  visible: (ctx) => ctx.isMobile,
  separator: true,
  option: { id: "sort", scope: "external", default: "recent", choices: LIBRARY_SORTS },
};

/** What a CARD carries.
 *
 *  Three toggles, not five. The old shared record listed Country and Date here
 *  too — and a card draws NEITHER: those two keys only ever moved columns in the
 *  list table, while Thumbnail and Metadata only ever moved parts of a card. So
 *  under one "Show information" heading, in every mode, sat five switches of
 *  which two did nothing where you were standing. Splitting the record is what
 *  made that visible; Country and Date are columns now, and live in the list. */
const CARD_INFO: DisplaySection = {
  id: "info",
  label: "Show information",
  kind: "toggles",
  separator: true,
  options: [
    { id: "preview", label: "Thumbnail", default: true },
    { id: "connections", label: "Connections", default: true },
  ],
};

/** How much of the record a card carries.
 *
 *  This was a Metadata on/off switch, which answered only "all or nothing" while
 *  the interesting number — how many properties — sat in the code as a constant
 *  nobody could see. A template's property count is not the app's to cap; the
 *  reader picks. `None` is the old off state, so nothing is lost. */
const CARD_FIELDS: DisplaySection = {
  id: "cardFields",
  label: "Metadata properties",
  kind: "choice",
  option: {
    id: "cardFields",
    default: "all",
    choices: [
      { id: "none", label: "None" },
      { id: "3", label: "First 3" },
      { id: "5", label: "First 5" },
      { id: "all", label: "All", detail: "Every property the template fills" },
    ],
  },
};

/** Size, then frame, then fit — the order the questions come in: how big, what
 *  shape, how the picture sits in it. All three are dead while the Thumbnail
 *  toggle is off, and they say so by dimming rather than by leaving. */
const thumbSections = (): DisplaySection[] => {
  const enabled = (v: DisplayValues) => v.preview !== false;
  return [
    {
      id: "thumbSize",
      label: "Thumbnail size",
      kind: "choice",
      separator: true,
      enabled,
      option: {
        id: "thumbSize",
        default: "m",
        choices: [
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
  cards: [CHART, SORT, CARD_INFO, CARD_FIELDS, ...thumbSections()],

  /** The list's options are its COLUMNS, one per track the table can draw —
   *  including the corpus's own metadata properties, which no other view can
   *  offer because no other view has somewhere to put them. Density is here for
   *  the same reason: rows are the only thing in the Library with a height you
   *  might want back. */
  list: [
    CHART,
    SORT,
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
    CHART,
    SORT,
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
    CHART,
    SORT,
    {
      id: "resultsLayout",
      label: "Results layout",
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
  map: [CHART, SORT],
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
      out.push({
        id: section.option.id,
        scope: section.option.scope ?? "mode",
        fallback: section.option.default,
      });
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
