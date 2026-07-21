# Uwazi 2026

Design system, screens, and interactive prototype for the Uwazi settings/admin UI redesign.

## Figma

All screens and the design system live in a single Figma file:

**[Uwazi v3 — Screens](https://www.figma.com/design/5VSISGr1dSEKi1dGG5Noft)**

| Page | Contents | Link |
|------|----------|------|
| Design System | 43 components, color/dimension variables, text styles, effect styles | [Open](https://www.figma.com/design/5VSISGr1dSEKi1dGG5Noft?node-id=40-2) |
| Import CSV | 8 screens: Empty State, List, List Selected, Modal, Detail (Completed, Processing, Failed, Warnings) | [Open](https://www.figma.com/design/5VSISGr1dSEKi1dGG5Noft?node-id=0-1) |
| Entity View | 10 screens: Document, Metadata, References, Relationships (Tree/Graph), Files (Card/Table/Selected/Multi-select/Translations) | [Open](https://www.figma.com/design/5VSISGr1dSEKi1dGG5Noft?node-id=29-2) |
| Reference Screenshots | Prototype screenshots for pixel-perfect reference | [Open](https://www.figma.com/design/5VSISGr1dSEKi1dGG5Noft?node-id=84-2) |

### Token System

- **Colors** — 26 variables with Light/Dark modes (backgrounds, text, borders, accents, semantic, highlights)
- **Dimensions** — 28 variables (spacing scale, border radii, component sizes)
- **Text Styles** — 14 styles (Heading XL–SM, Body LG–XXS, Label LG–XS, Caption)
- **Effect Styles** — 8 styles (Shadow SM–XL, Modal, Dropdown, Card, Tabs)

All components are bound to variables — switching a frame to Dark mode updates colors automatically.

## Structure

```
.
├── app/                           # Interactive prototype (Vite + React 18 + TS + Tailwind v4 + Jotai)
│   ├── src/
│   │   ├── atoms/                 # Jotai state (navigation, entities, references, files, selection,
│   │   │                          # filters, suggestions, notifications, theme, language, viewport)
│   │   ├── components/
│   │   │   ├── layout/            # Navbar, Beacon + NotificationsDrawer, SplitView, AdaptiveSplitView,
│   │   │   │                      # MainTabs, DrawerTabs, SegmentedTabs, Breadcrumb, DocMeta,
│   │   │   │                      # ToolsSidebar, ToolsActionBar,
│   │   │   │                      # MobileBottomSheet, MobileActionMenu, MobileNavDrawer
│   │   │   ├── viewer/            # DocumentViewer, PageHighlights, FloatingMenu, ActionBar, RefMinimap, HoverExpand
│   │   │   ├── relationships/     # The merged Relationships surface: ReferencePanel, RelationshipsPanelBody,
│   │   │   │                      # RelationshipRow + rows/ (AggregateRow, HubRow, ReferenceRow, RowCheckbox),
│   │   │   │                      # RelationshipGroupedCard, RelationshipsTreeView/TreeBranch,
│   │   │   │                      # RelationshipsGraphView, RelationshipsActionBar, RelationshipsDrawerSection,
│   │   │   │                      # RelationshipsFilterDrawer, SearchBar, ViewControls, GroupByControl,
│   │   │   │                      # SortControl, ZoomControl, DirectionGlyph, ActiveFilterChips,
│   │   │   │                      # EntityOverlay, HighlightCard, RelatedDocCard, ToCPanel, TemplateStructure,
│   │   │   │                      # MetadataDrawerContent, DrawerActionBar, IxSuggestionsCard,
│   │   │   │                      # CreateRelationshipModal, ManageRelationTypesModal
│   │   │   ├── files/             # FileTable, FileDrawer, FileDetailEditor, FileViewerModal, DocumentGroupCard,
│   │   │   │                      # DrawerFilesBody, AddFileModal, AddFileDropArea
│   │   │   ├── metadata/          # MetadataCard, MetadataRecord, ConnectionGroupCard,
│   │   │   │                      # RelationshipFieldCard/Editor, InheritedValueChip, ProvenanceTrail
│   │   │   ├── import-csv/        # ImportCSVLayout, ImportListView, ImportDetailView, ImportTable,
│   │   │   │                      # EntitiesTable, IssuesTable, ImportEmptyState, NewImportModal
│   │   │   ├── shared/            # List/filter primitives (ListInfoRow, ListCardRow, FiltersButton, FiltersDrawer,
│   │   │   │                      # FacetSection, ActiveFilterChip, Checkbox, SelectControls, FadeTruncate);
│   │   │   │                      # elements (EntityPill, PageTag, CountBadge, ViewButton); feedback (ConfirmDialog,
│   │   │   │                      # UwaziLoader, StatusBadge, ProgressBar, StatsCard, Stepper, AlertBanner)
│   │   │   └── catalog/           # CatalogEntry, StyleGuide
│   │   │   ├── library/           # The Library view: EntityCard, EntityThumbnail, LibraryFilters,
│   │   │   │                      # ActiveFiltersSheet/Button, DisplayMenu, TimeBrush, BucketBreakdown,
│   │   │   │                      # LibraryTimelineView, LibraryMapView, LibraryClusterDrawer,
│   │   │   │                      # EntityDrawerPreview, SearchTipsPopover, ResultsSnippets/ (the
│   │   │   │                      # Results panel: ResultsBody, EntityResultCard)
│   │   │   ├── search/            # Document search: DocumentSearchBody, PageSpine
│   │   │   ├── settings/          # Settings clone: SettingsContent/Nav/Table/Button/Field/RowActions,
│   │   │   │                      # StatusPill, pages/ (18 pages incl. TemplateEditor, ThesaurusEditor)
│   │   │   ├── agent/             # "Bert" assistant: AgentModal, BertMark
│   │   ├── data/                  # Mock data (entities, document, references, files, metadata, toc, imports,
│   │   │                          # suggestions, settings) + cejil/ (the full published corpus, lazy JSON)
│   │   ├── stories/               # Storybook stories for shared primitives
│   │   ├── utils/                 # Pure helpers (queryTokens + librarySnippets/searchSnippets search engine,
│   │   │                          # libraryFilter, deriveRelationships, inheritance + chainTraversal,
│   │   │                          # connectionGrouping, i18n shim)
│   │   └── views/                 # Page-level orchestrators (LibraryView, EntityView, RelationshipsView,
│   │   │                          # FilesView, MetadataView, SettingsView, ImportCSVView, CreateRefView,
│   │   │                          # ComponentCatalog, ToastContainer; catalog/ demos)
│   └── public/                    # Static assets (sample PDFs, logos, cejil-data/ JSON corpus)
├── handoff/                       # Migration kit for huridocs/uwazi (see below)
├── images/                        # Logos, screenshots, assets
│   └── screens/                   # Prototype screenshots (prototype/ + import_csv/)
├── ui/                            # Legacy design files
│   └── archive/pen-originals/     # Archived .pen files (Pencil format)
├── docs/                          # Rebrand guides & design documentation
├── CLAUDE.md                      # Working handoff: decisions and patterns not obvious from the code
└── README.md
```

## Prototype

Interactive frontend for testing layout, navigation, and interaction patterns. All mock data, no backend.

### Quick start

```bash
cd app
npm install
npm run dev            # → http://localhost:5173 (check the output; the port varies)
npm run storybook      # → http://localhost:6006
npx tsc --noEmit       # type check
```

### Data sources

The collection switcher in the navbar toggles between two corpora:

- **Sample** — a curated set of demo entities, small enough to reason about.
- **CEJIL** — the full published corpus (~4,400 entities, ~17,000 relationships,
  80 PDFs). Heavy data is JSON under `app/public/cejil-data/`, fetched on demand,
  so Settings and first paint never pay for it.

### Conventions

- **Units** — `rem` for layout dimensions. Tailwind spacing utilities are fine (they output `rem`). Reserve `px` for borders, shadows, sub-pixel details.
- **Colors** — All via CSS custom properties in `tokens.css`, mapped to Tailwind in `index.css`. Dark mode comes free — never hardcode hex values.
- **State** — Jotai atoms for cross-component state, local `useState` for view-scoped UI.

### Navigation

- **Library** (default) — the collection: entities as **cards, list, table, map, or timeline**, with a
  faceted filter drawer (type, status, country, descriptors, dates, inherited and chained properties)
  and a time brush. The search box matches metadata *and* document text — quoted phrases, `*` / `?`
  wildcards, `AND`/`OR`/`NOT`, diacritic-insensitive ("velasquez" finds "Velásquez") — with a **tips**
  chip explaining the syntax. The drawer's **Results** tab shows *where* each term hit: passages grouped
  under **Properties** (click → that entity's metadata, field focused) and **Document** (click → the
  document at that page), with matches marked in place. Opening an entity leads to:
- **Entity view** — four main tabs (**Document · Metadata · Relationships · Files**):
  - **Document** — PDF viewer with highlights, floating menu, and `RefMinimap` scroll track
  - **Metadata** — Metadata cards + drawer (Document preview, Relationships, Files, Template). Includes **relationship & inherited properties**: fields whose values come from connected entities (single + multi-inheritance), shown with provenance (source entity + relation + inherited property) and a carbon "inherited" marker. Inherited values are read-only — you edit the **connection** (entity picker, syncs sibling fields) or jump to the **source entity** to change the native value.
  - **Relationships** — The single surface for text references and entity-to-entity links (one `Reference` record, projected per-evidence or as derived aggregates). Three views: **List** (with grouping by target/source template, entity, relation type, direction, or page), **Tree** (collapsible relation-type → target → evidence, detail → compact → overview zoom), and radial **Graph** (pan/zoom, branch collapse). Boolean search (AND/OR/NOT/"exact"/wild\*); filters slide-over. Hosts AI (IX) suggestions and the Create-relationship flow.
  - **Files** — Primary + supporting files with multi-select; drawer shows focused file (default: the entity's primary file) with an inline edit mode

  The entity drawer adds **ToC** and **Search** — the latter searching this document's text and listing
  the passages with their pages, sharing the Library's snippet engine.
- **Settings** — a clone of the Uwazi settings section: 18 pages grouped **User / System / Tools**, with
  live editors for templates and thesauri.
- **Tools > Import CSV** — Full import lifecycle with sidebar, list/detail screens, and upload simulation
- **Ask Bert** — the agent assistant (navbar button or **⌘K / Ctrl K**): a centred modal with mocked
  streamed replies and a narrowing context chain (library › view › document, plus attachable entities
  and files). Long-running answers become tasks tracked in the Beacon.
- **Notifications** — a navbar **Beacon**: a colour-coded `UwaziLoader` mark (seal = error, amber = warning, carbon = info/processing, ink = idle/done) that animates while tasks run, auto-expands on a new task and on hover to surface the most pressing item. Clicking opens a slide-over **drawer** — a live **Tasks** section (multi-task, progress) plus a grouped (New / Today / Earlier), filterable notification log with per-item Retry / mark-read / dismiss and expandable error traces. Action toasts are consolidated into this surface.
- **Logo click** — Toggles to/from the component catalog

### Component catalog

The in-app design system (`ComponentCatalog`, opened via the logo) is organised into these groups:

- **Handoff** — the `handoff/` migration docs, rendered in-app (drop a `.md` file in `handoff/` and it appears)
- **Style Guide** — Colors, Typography, Shadows, Border Radius, Spacing
- **Elements** — EntityPill, PageTag, CountBadge, Buttons
- **Entity View — Layout / Document / References / Metadata / Files / Drawer / Relationships**
- **Import CSV — Layout / Components**
- **Filters & Lists** — the reusable surface primitives: FiltersButton, FiltersDrawer, FacetSection, ActiveFilterChip, ViewModeControls, CollapseControls, ListInfoRow, ListCardRow, Checkbox, ZoomControl, FadeTruncate, SelectControls
- **Shared** — ConfirmDialog, Toast, UwaziLoader

The **References** and **Relationships** groups both showcase `RelationshipRow` (reference / aggregate / hub variants) and `RelationshipGroupedCard` — the two projections of the same record.

Each entry renders a live preview, the calling code, and the Tailwind token it's built from.

## Handoff kit

`handoff/` is the migration kit for the real repo (`huridocs/uwazi`, branch `production` — also
Tailwind v4 + Storybook), readable on disk or in-app under the catalog's **Handoff** group:

| File | What it's for |
|---|---|
| `uwazi-semantic-tokens.css` | The PR-ready additive token layer, scoped to their `.tw-content` |
| `TOKENS-MAPPING.md` | Token-by-token map, the two-layer var rule, phase plan |
| `DATA-SEAMS.md` | How prototype shapes relate to the v2 data model — references vs relationships, inheritance, the search/snippets seam |
| `PATTERNS.md` | The a11y, motion, and style rules to preserve, plus a review checklist |
| `COMPONENT-INVENTORY.md` | Prototype ↔ uwazi component pairings, difficulty-rated, with a migration order |
| `PILOT-COMPONENTS.md` | Per-component build sheets for the six Phase-2 pilots |
| `PR-BODY.md` | Draft PR description for the tokens phase |

Keep it in sync when tokens, patterns, or data shapes change — it's the artifact the frontend team
actually reads.

## Branding

### Logo & Icons

| Asset | Preview | File |
|---|---|---|
| Wordmark | ![Wordmark](images/nu-logo.png) | `images/nu-logo.png` / `.svg` |
| App icon (dark) | ![Icon](images/icon.png) | `images/icon.png` |
| App icon (light) | ![Icon white](images/icon-white.png) | `images/icon-white.png` |
| Symbol | <img src="images/logo_sym.png" height="24" /> | `images/logo_sym.png` |

Navbar wordmark: **73 x 18**. Wordmark is the default — symbol only where space is constrained. Seal square always above Carbon.

### Palette

| Name | Hex | Role |
|---|---|---|
| Ink | `#1A1A1A` | The letterpress — text, headers, primary buttons |
| Seal | `#E8432A` | The stamp — danger, alerts, destructive actions |
| Carbon | `#00B4F0` | The copy — links, data, processing states |
| Vellum | `#F5EED7` | Warm stock — muted backgrounds, hover states |
| Parchment | `#F5F0E8` | Cool stock — page grounds |
| Paper | `#FFFFFF` | The margin — cards, modals, open space |

## Screenshots

### Entity View

| Document viewer | Files (selected) |
|---|---|
| ![Document](images/screens/prototype/01-document-view.png) | ![Files](images/screens/prototype/05-files-selected.png) |

| References | Dark mode |
|---|---|
| ![References](images/screens/prototype/02-references-main.png) | ![Dark](images/screens/prototype/07-dark-mode.png) |

### Import CSV

| List | Detail (Completed) |
|---|---|
| ![List](images/screens/import_csv/010%20Import%20CSV%20-%20List.png) | ![Detail](images/screens/import_csv/007%20Import%20CSV%20-%20Detail.png) |

| Empty State | Modal |
|---|---|
| ![Empty](images/screens/import_csv/001%20Import%20CSV%20-%20Empty%20State.png) | ![Modal](images/screens/import_csv/002%20Import%20CSV%20-%20New%20Import%20Modal.png) |

---

*Uwazi Design Team*
