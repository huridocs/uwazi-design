# Uwazi 2026 prototype

Conventions and decisions that the code does not make obvious. Read this once per session.
History, measurements and incident notes live in auto-memory (see "Where context lives").

## Stack and commands
- Vite + React 18 + TypeScript + Tailwind v4 + Jotai. Mock data only, no backend, no router:
  `views/` are pages switched by top-level state.
- Dev: `cd app && npm run dev`. Default port 5173; under Operator, use the port the session reserves.
- Gates before any push: `cd app && npx tsc --noEmit && npm run build`.
- Storybook 10 (react-vite, a11y, docs): `cd app && npm run storybook` → :6006. Stories are in
  `app/src/stories/`. `.storybook/preview.tsx` loads `src/index.css` and toggles `:root.dark`.
  The a11y addon checks every story; new primitives ship with no violations.
- A new shared primitive gets a story and a `CatalogEntry`. Story names are generic (Default,
  Minimal, AllStates, Empty). Domain strings may appear as demo data, not as story names.
- Branches: work lands on `playground`. `main` is reduced and takes only what Juan names.

## Working with Juan
- Terse and directive; infer scope. Feedback is usually a screenshot.
- Brand terms: ink (text), stamp/seal (red, danger only), parchment/vellum/paper/warm (neutrals),
  carbon (blue, data accent). Ink is primary. Semantic amber/green/red stay as they are.
- "Calm and editorial". He asks for changes, not design options: make the change and show it.
  Commit when asked.

## Vocabulary
One term per concept, in code, comments, docs and UI copy.

| Concept | Term |
|---|---|
| One stored edge, optionally anchored to text | reference |
| Aggregate of references by (target, relationship type) | relationship |
| The entity-view tab showing both | Relationships |
| Metadata property linking to entities | relationship field |
| An entity's schema | template |
| Docked, resizable right pane | drawer |
| Panel that slides over a pane | slide-over |
| Phone bottom panel | sheet |
| Entity shown beside other content | preview |
| The entity a view is about / shown in a drawer / checkbox set / jump target | focused / open / selected / active |
| Background job / log entry | task / notification |
| The assistant | Bert in the UI, `agent*` in code |

## Data model

### References and relationships
Uwazi v2 stores one `Relationship { from, to, type }`; either end may carry a text anchor
`{file, selections[], text}`. The prototype keeps a simpler shape:

- `data/references.ts`: each row is a `Reference` with `sourceEntityId`, `targetEntityId`,
  `relationType`, `direction` (default `outgoing`), optional `sourceSelection` (the text anchor;
  absent means an entity-to-entity link), optional `targetSelection`, optional `hubId`.
- `utils/relationships.ts`: `deriveRelationships(refs)` groups by `(targetEntityId, relationType)`
  at runtime. Direction is not in the key; incoming and outgoing to the same target and type merge
  into one row with `directions[]` of length 2. A relationship exposes `refIds`, `evidenceCount`
  (`refIds.length`) and `firstPage` (undefined when no backing reference is anchored).
- A hub id with one member is a plain aggregate; hub rows have two or more members.
- A selection on page 0 is a quote from a source with no pages (the Nepal corpus's web
  articles): read pages through `selectionPage()`, which returns undefined for it, so no page
  tag or jump is drawn.
- `Reference.verification` (confirmed / single-source / disputed) and `Reference.period` (when a
  link held) are optional; only Nepal fills them. Rows show them through `RefStatus`; the panel's
  Verification facet and "As of" day self-hide where no reference carries them. Per-property
  evidence is `data/fieldEvidence.ts` (a provider per corpus; Nepal's `evidence.json` loads on
  first use, not with the collection) and shows as "Why we believe this" in the card head.
- The list view renders references; the tree and graph render relationships.
- Full write-up for the real repo: `handoff/DATA-SEAMS.md`.

Known gaps, kept on purpose:
- Target-side anchors exist only in `ref-tt-1..3`; there is no jump to the target passage and no
  grouping or filtering by target text.
- No inverse relationship-type labels (v2 stores one `type`).
- No `createdBy`, source kind or confidence on references. Filters on those need data first.

### Relationship fields and inheritance
- `RelationshipMetadataField` (`type: "relationship"`) links to entities of `targetTypeId` via
  `relationType`, with `connectedEntityIds`. Code that reads `.value` must filter these out
  (`f.type !== "relationship"`).
- Inheritance has one resolver, `resolveInherited` in `utils/inheritance.ts`, returning
  `{ value, steps }`. `inheritProperty` reads a native property on the connected entity.
  `inheritPath` + `inheritLeaf` walk several hops through `chains()` (`utils/chainTraversal.ts`).
  The graph is injected with `registerInheritanceGraph`; `inheritance.ts` never imports CEJIL.
  Values resolve at render; nothing is stored.
- Fields sharing a `connectionKey` are one connection with several inherited columns, edited
  together. `groupConnections` returns groups and singles.
- `steps` render as a `↳ via …` trail (`ProvenanceTrail`), hoisted to one line when every row
  shares it. `reduce` (`list|distinct|count|min|max|first`) renders a `Σ` `RollupChip`.
- Record and edit form place relationship fields at their template position; there is no
  "Relationships" heading. A multi-column group renders once, at its first member. CEJIL profiles
  are put in template order by `orderByTemplate`; fields the template does not declare go last.
- Edit mode: inherited values are read-only. `RelationshipFieldEditor` edits the connection,
  with an entity picker filtered by `targetTypeId`. "Source" opens the entity in the slide-over.
- Simplification: connections are explicit `connectedEntityIds`, not derived from references.

### Documents
- Files are addressed by `_id`, not filename. CEJIL `files.json` has 5,245 records but only six
  filenames. `docPagesOf` reads `_id` first and falls back to the filename for unrecovered records;
  removing the fallback empties full-text search for those records.
- `scripts/recover-cejil-docs.cjs` calls a third party's production server. It is serial,
  entity-capped (`CEJIL_RECOVER_LIMIT`) and byte-capped (`CEJIL_RECOVER_BUDGET_MB`), and stops on
  429/5xx. Do not parallelise it or raise the caps.
- A CEJIL entity without a PDF reads a connected one's (`cejilRenderedDoc`). The snippet path
  carries that as `borrowedFrom`, printed as `↳ from <document>` by `BorrowedDocLine`, on a line
  that is already mounted. `↳ via` and `↳ from` both render through `shared/ProvenanceLine.tsx`.
- Document tab renditions: `documentFormatAtom` = `pdf | text | html` switches the rendition of the
  default primary document. `DocumentViewer` keeps the PDF mounted and hidden, because remounting
  leaves the canvases blank. Rendition text is `data/velasquez-judgment-{en,es,fr,ar}.txt`, parsed
  by `data/documentRenditions.ts`. All four languages stay on the same judgment so references
  line up; FR/AR use the EN PDF. `DocumentRendition` reads the focused profile's `renditions`
  first (CEJIL's judgment text, Nepal's OCR) and falls back to the sample. The text's script sets
  the direction, not the reading language.
- `EntityProfile.documentProvenance` (issuer, source URL, licence basis, text note) prints under
  the Document tab's `DocMeta` (`DocProvenance`). Nepal's government PDFs use it to show the
  issuer and source and to mark the text "OCR, unreviewed".

### Settings stores
- A settings domain's records live in a store built with `createSettingsCollection`
  (`atoms/settingsCollection.ts`): seed plus a created/patched/deleted overlay, ids from
  `newSettingsId`, overlay in sessionStorage. Settings and every other reader use the store,
  never the seed. Users and groups (`atoms/users.ts`) are the first; thesauri predate it.
- Scope: what describes a collection's content (templates, thesauri, relationship types,
  filters, menu, pages, translations, languages) is per corpus. What describes the people who
  sign in (users, groups, the account) is global, because login comes before a collection.
- Membership is by group id on the user; a group's member count is derived.
- Every store registers with `registerSettingsReset`; Settings › Dashboard › "Reset demo data"
  clears them all.
- Every settings editor and form page edits through `useSettingsDraft`, which registers with
  the dirty guard. Dirty compares with the last save; call `markSaved` on a page that stays
  open. The settings header guards back, breadcrumb and the mobile back chevron.
- Usage: `atoms/settingsUsage.ts` answers what a template, property, thesaurus, value, relationship
  type, group, user or language is used by (pure logic in `utils/settingsUsage.ts`). Deletes go
  through `components/shared/SettingsDeletes.tsx` on `ConfirmDelete`, which lists the impact and,
  where Uwazi refuses, names the rule and offers only OK. A confirm message says only what the code
  does.
- A child row removed inside an open editor (property, value, filter group, sub-link) gets an Undo
  in the Beacon (`useSettingsUndo`), not a dialog. The undo ends when the editor unmounts.
- Every settings create, save and delete goes through `useSettingsNotify().record`: one Beacon
  notification plus an Activity log entry (`atoms/activityLog.ts`), scoped to the corpus (users
  and groups: global). A save to a list that lives only in a page's state passes `log: false`:
  the log lists only changes that survive navigation. Editor footers show `LastSavedLine`.
  Transient feedback that changes no record stays on `useNotify`.
- Collection, Global CSS & JS and Filters are per-corpus singletons (`createSettingsSingleton`,
  `atoms/settingsSingletons.ts`). The window title, the Library's default view and its Template
  facet read them.
- Relationship types are one registry per collection (`atoms/relationTypes.ts`), by id: the
  Sample's is `relationTypesAtom`, which Settings, the Relationships panel and the template
  editor's relationship fields share. Settings never lists `no_label`.
- Settings is gated by the signed-in role (`settingsAccessAtom`): collaborator sees Account only;
  editor sees Account and the extraction pages; admin sees everything.
- Every Settings page is one of three shells: `SettingsListPage` (intro, toolbar with search and
  filters, table, lead create action), `SettingsEditor` (list → detail, Cancel then the commit)
  or `SettingsFormPage` (one form, Discard changes then Save). Bodies use `SettingsSection`,
  `SettingsFieldRow`, `SettingsCheckList`, `SettingsStat`; empty lists use `SettingsEmptyState`.
  A form keeps fields and prose at 40rem (`data-measure`); a block marked `data-table` is exempt.
  A table of per-corpus records passes `corpusScoped` (loading rows, and an error if the load fails).
  Row actions show on hover and focus; a row that opens its editor has no pencil.

## Layout and style

### Units, gutter and rhythm
- Layout in rem. Raw px only for borders, shadows and sub-pixel details.
- The pane sets the side gutter once; rows carry no `px-*`/`mx-*`.

  | Class | Width | Used by |
  |---|---|---|
  | `gutter-host` | 12px | drawers, side panels, Library main pane, all four entity-view panes |
  | `gutter-host-main` | 16px | Settings content, Import CSV, notifications drawer, `Modal` |
  | `gutter-host-rail` | 20px | `SettingsNav`, Bert |

  Each host also sets `data-gutter-host`. Views that share a tab strip use the same tier, or the
  strip moves when the tab changes.
- A box that must reach the pane edge uses `bleed` or `bleed-flush` (`index.css`). A `bleed`
  button widens only when a flex column stretches it. Inside `DocumentViewer` (itself
  `bleed-flush`) `bleed` reaches nothing, so its action bar takes the gutter as padding.
- `MainTabs`, `DocMeta`, `ListInfoRow`, `DrawerTabs` and `SearchBar` have no side padding and must
  sit directly inside a host.
- Every table spans its pane inside the gutter (no `max-w`, `w-fit` or fixed width); the name
  column takes the slack.
- Vertical rhythm is `stack` (8px). Each host declares `--body-top`; the first block of every tab
  body takes it with `body-top`, so first blocks line up across tabs.
- A padded control declares its edge: `data-gutter-align="box"` or `"text"`.
- Check with `window.__gutter()` in the console. Do not judge gutters by eye.

### Tokens
Use Tailwind utilities. When raw `var()` is needed (SVG `fill`/`stroke`, `style`), use these names
with no fallback. `var(--ink, …)`, `var(--bg-paper, …)` and `var(--bg-vellum, …)` do not exist;
only the fallback paints, and dark mode breaks.

| Concept | Var | Tailwind |
|---|---|---|
| primary / secondary / tertiary / muted text | `--text-primary` / `-secondary` / `-tertiary` / `-muted` | `text-ink` / `text-ink-secondary` / `-tertiary` / `-muted` |
| paper bg | `--bg-surface` | `bg-paper` |
| warm bg | `--bg-warm` | `bg-warm` |
| vellum bg | `--bg-muted` | `bg-vellum` |
| parchment bg | `--bg-primary` | `bg-parchment` |
| selected bg | `--bg-selected` | `bg-selected` |
| border / soft border | `--border-primary` / `--border-soft` | `border-border` / `border-border-soft` |

`handoff/uwazi-semantic-tokens.css` and `handoff/TOKENS-MAPPING.md` mirror these for the real
repo; update them when tokens or style rules change.

### Visual rules
- Selected state is `bg-parchment`. No other selected colour.
- No thick left-border or inset accents. Use a dot, an icon colour or a tint.
- Active sidebar item: `bg-warm text-ink`, icon colour unchanged.
- Badges are `w-fit`.
- Layout does not shift on state change. A row that appears conditionally (a summary, a count, a
  chip row) stays mounted at a fixed height and only its contents change.
- Radii are overridden in `index.css` (`xs 2 … 4xl 16`). Entity dots are `rounded-[2px]`, track
  dots `rounded-full`, pills and badges `rounded-md`.

### Type roles
One recipe per role; the full table is `handoff/TYPOGRAPHY.md` §3.
- Title (page bar, dialog, drawer, sheet) and section heading: `text-sm font-semibold text-ink`.
- Caps label (section label, table header, stat label): `text-meta font-semibold uppercase
  tracking-wider text-ink-tertiary`. Use `SectionLabel`.
- Status badge `text-meta font-semibold`; chip `text-meta font-medium`.
- Table primary cell `text-sm font-medium text-ink`; secondary or count cell
  `text-xs text-ink-tertiary tabular-nums`.
- Input `text-sm`, `h-9`, in pages and modals (`MODAL_INPUT`). Search fields and the
  `BatchEntryModal` grid stay `text-xs`.
- Help and caption `text-xs text-ink-tertiary`. Empty message `text-sm font-medium
  text-ink-secondary`; one-line empty `text-xs text-ink-tertiary`.
- Stat figure `text-xl font-semibold tabular-nums`. Breadcrumb `text-sm`.
- UI text tops out at `font-semibold`. Text never uses `text-ink-muted`; it is for placeholders,
  disabled controls, icons and separators.

### Buttons and dialogs
- A warm button on paper outside bars and dialogs uses `WARM_BUTTON` from
  `components/shared/warmButton.ts` (fill plus `WARM_EDGE`). Buttons on warm, parchment or vellum
  grounds, in the navbar, and the Beacon take no edge.
- Action bars and modal footers have no borders, rings or edges. The ladder, in `warmButton.ts`:
  solid ink for the commit (Save, Open entity, New import); `BAR_LEAD` (no fill, ink, medium) for
  the lead action when there is no commit; `BAR_GHOST` for the rest; `BAR_DANGER` (seal text) for
  Delete. Groups are split by `BarDivider`. A selection shows its count in a fixed slot; the bar
  is not tinted.
- Every dialog is `components/shared/Modal.tsx`; the one exception is Bert's `AgentModal`.
  - Widths: `sm` 28rem, `md` 32, `lg` 40, `xl` 48 (full screen below md), `grid` up to 80rem for
    spreadsheet bodies.
  - 3rem header (`text-sm` title, inline subtitle), 3rem footer on the bar ladder (`MODAL_COMMIT`,
    `MODAL_DANGER`, `BAR_GHOST`).
  - The panel is a `gutter-host-main` host. List or step modals pass a fixed `height`.
  - `scope="pane"` covers one pane through `ModalHostProvider`. `portal={false}` when the host's
    outside-click check must see the modal as inside (drawers, the entity slide-over).
  - A control that handles Escape itself calls `preventDefault()`.
  - Bodies use `components/shared/ModalParts.tsx` (`ModalSearchRow`, `ModalList`, `ModalListRow`,
    `ModalSectionLabel`, `ModalField`, `ModalStatus`, `MODAL_INPUT`/`LABEL`/`TEXTAREA`).

## Accessibility
- A clickable row or card is never `role="button"`. It renders a stretched invisible button as
  its first child (focus ring, `aria-pressed`, accessible name); content sits above it in a
  `relative` wrapper so nested controls work. Used by `EntityCard`, `DataTable` and
  `ListCardRow` with `onClick`. Give `DataTable` a `rowAriaLabel`; the fallback is "Open row".
- A row whose actions are all visible controls has no row target. Relationship rows
  (`rows/RowShell.tsx`) expose the entity pill ("Open Case 12.045") and the page tag ("Go to page
  14"); delete stays behind hover. `PageTag` and `RowEntityPill` stop propagation.
- Slide-overs that stay mounted get `inert` while closed. Without it, Tab reaches hidden controls
  and scrolls the pane.
- Overlays trap focus with `hooks/useFocusTrap.ts` on the panel and restore focus on close.
  `Modal` does this for every dialog.
- Hover-revealed actions add `group-focus-within:opacity-100`.
- Interactive SVG elements get `tabIndex`, `role`, `aria-label`, Enter/Space and a drawn focus
  ring.
- Type labels never use the raw type colour. `typeLabelColor` (`utils/typeColor.ts`, the only
  implementation) mixes saturated colours toward ink by `--label-mix` (55%, `tokens.css`). Check a
  new colour against the 22-colour palette in `data/cejil/typesAdapter.ts`, in dark mode, which
  is the stricter case.
- Live updates use `aria-live="polite"`, `role="status"` or `role="log"`.

## Surfaces

### Relationships panel
- `views/RelationshipsView.tsx` (main tab) and `RelationshipsDrawerSection.tsx` (drawer) render
  the same body, `RelationshipsPanelBody.tsx`, switched on `relViewAtom` (`list | tree | graph`).
- Filtering happens only in `useFilteredReferences.ts` (cluster → facets → search → sort). No view
  body filters on its own.
- Toolbar: `SearchBar` with `ActiveFilterChips` inline, then `ViewControls`,
  `RelationshipsDisplayMenu` (zoom, group-by, sort) and `FiltersButton`. Zoom applies to grouped
  and tree views.
- Filters are a drawer tab where the entity view has a drawer (Metadata, Relationships and
  Document views: `RelationshipsFiltersTab`, registered with `useRelFiltersDock`); the toolbar's
  Filters button switches to it, and the tab carries the dot. The slide-over remains for scoped
  surfaces (entity slide-over, Library preview); phones open the sheet.
- `RelationshipRow` is a union: `kind="reference"` (prop `reference`), `"aggregate"` (prop
  `rel`), `"hub"`. Highlight comes from `activeRefIdAtom` or `activeAggregateIdAtom`.
- Row targets: the entity pill opens the slide-over (`previewEntityIdAtom`); the page tag jumps to
  the passage (`activeRefIdAtom`, `currentPageAtom`, `scrollToHighlightAtom`). At compact and
  detail zoom an aggregate's title is the button. A hub's member pills each open their member.
- Panel state is per scope: read through `useRelAtom*` / `relAtomFor` (`hooks/useEntityScope.tsx`).
  Without an `EntityScopeProvider` these are the global atoms. The slide-over and the Library
  preview get their own, and the slide-over resets its state on open. Add new panel state through
  `relAtomFor`. Clear with `useClearRelFilters()`.
- Default sort: list by appearance, tree and graph by most evidence.
- The only number on this surface is the tab count (`references.length`). Toolbars and info rows
  show none. Group headers give their unit in a tooltip and sr-only text.
- Anchoring and Direction facets hide when every reference has the same value.
- Graph (`RelationshipsGraphView.tsx`): wheel zoom needs a native `{ passive: false }` listener;
  tooltips are HTML positioned from `getBoundingClientRect`, never SVG inside the zoom transform.

### Entity preview
- One body, `components/entity/EntityDetailBody.tsx`, in two hosts: `EntityDrawerPreview` (Library
  drawer) and `EntityPreviewSlideOver` (slide-over, mounted by RelationshipsView, MetadataView,
  EntityDrawer and the drawer preview while editing). The host owns only its chrome.
- The body wraps its content in `EntityScopeProvider`. The drawer preview may change the focused
  entity; the slide-over may not, because the view beneath it must keep its entity.
- The slide-over shows Metadata and Relationships only. Document, Files and Edit read the focused
  entity's file atoms and would be wrong for another entity; "Open entity" leads to them.
- "Open entity" is hidden (`invisible`) while any edit form is open (`editSessionOpenAtom`).
- Copy From: `CopyFromPicker` chooses the source, then the properties to copy. The form receives
  only the ticked `CopyUnit`s and does not save.

### Metadata view
- Drawer tabs: Relationships, Files, Template, Filters.
- Click-to-fill: focusing an input arms it (`fillTargetAtom`), and the arm survives blur. The
  label row shows `ListeningChip`. A value is committed only by a click: "Fill <Field>" in
  `FloatingMenu`, or a value row in the record. Selecting text alone never writes.
- The signal is a value in `fillRequestAtom` (`{fieldId, value, nonce}`), like `scrollToPageAtom`,
  never a callback owned by the form. `MetadataEditBody` clears `fillTargetAtom` on unmount.
- Arming ends on fill, Escape (ignored inside a dialog), the chip's ×, or Save/Cancel. Date
  inputs do not arm. A filled field scrolls into view and flashes.

### Library
- Search evidence comes from one path, `buildSnippetsFor` / `matchCategories`
  (`utils/librarySnippets.ts`, tokens from `utils/queryTokens.ts`), used by:
  - `MatchOrigin`: a row mark in the List table and the timeline spine, shown only when the match
    is in a field the row does not display.
  - Results (`libraryViewModeAtom = "results"`): a search switches to it and remembers the
    previous view; `clearLibrarySearchAtom` restores it. Leaving Results during a query cancels
    both. Logic lives in `atoms/library.ts`. Layouts (`libraryResultsLayoutAtom`): grouped, tree,
    passages, spine. None repeats the title snippet.
  - `TimeSpine`: the one chronology for the timeline and the Results spine. Callers pass rows,
    `rowHeight` and `renderRow`; never recompute its geometry. Marks sit on the axis; touching
    marks share one capsule and brace with no count; the "N later" label sits at the row
    columns' start.
- Ending a search always goes through `clearLibrarySearchAtom`. The masthead readout beside the
  search box holds the only count and `ActiveSearchChip`.
- Date filter: bounds are a day or a day and "HH:MM", read as UTC (`dateBoundMs`). A record with
  `Entity.span` (a Nepal event's start and end at its precision) matches when the span overlaps;
  others are a point at `createdAt`. The filter, its presets, the brush and the timeline view all
  use `entityInRange`. Time fields show only where a record is timed to the hour.
- Facets compile to an AND of nodes (`compile` in `utils/libraryFilter.ts`); a group (OR of two
  facets, NOT of one) is one node. A facet's counts skip the whole node it sits in, so inside a
  group they show what a tick would add or remove. Value facets and ranges have a Match mode
  (any / all / none / missing, `libraryFacetMatchAtom`); `none` and `missing` keep only records
  whose template carries the property. Several facets are counted in one pass with
  `forEachFacetBase`, not one `matchesAll` pass each.
- Search history: `atoms/savedViews.ts`, recorded on settle (1.2s, Enter, blur) with the filter
  state it ran under (`LibrarySnapshot`), per collection, last 20, in sessionStorage. The search
  box's recent list shows the first 8 distinct queries and re-runs the words only; the Views
  menu's history restores the filters too.
- Saved views: the masthead's Views menu (`SavedViewsMenu`). A `LibrarySnapshot` lists every
  atom that decides what the Library lists and how it draws it (`captureLibrarySnapshot`,
  `applyLibrarySnapshotAtom`); a new filter atom joins both and `snapshotFilterCount`. Views are
  per collection in localStorage; "Copy link" puts the snapshot in `#view=…`, which `useViewLink`
  applies on load and then removes. Match modes, range bounds and groups are optional snapshot
  keys (`match`, `ranges`, `groups`): a view or link saved before them opens with the defaults, and
  an old Country/Descriptor "AND" opens as `all`.
- Case: one per collection (`atoms/caseFile.ts`, localStorage): pinned records and markdown
  notes. `PinToggle` pins from a card footer, the entity header (`DocMeta`) and a relationship
  pill. `CasePanel` (navbar Case button; a sheet on phones) lists the pins, the notes and the
  citation list built by `utils/caseCitations.ts` (Nepal: the quoting source's URL, publisher and
  date, the link's status, the PDF page; CEJIL: the summa.cejil.org record and its anchored
  quotes). Exports: copy as text, Markdown, CSV. Reset demo data and the Dev panel clear saved
  views, cases and history.
- Tabs: `count` is inventory and sits in the flow. `dot` marks user-set state behind an unselected
  tab and is absolutely positioned (filters, doc search, the Library drawer's tabs).
- Thumbnails:
  - Display › Thumbnail is Auto / On / Off (stored under `preview`). Auto is on when at least
    half of the filtered results have a preview: an image, a document's first page (CEJIL file
    records, Sample documents, Nepal PDFs) or a recording (CEJIL Audiencias, which draw the
    play tile; there are no posters). CEJIL therefore opens with thumbnails. The menu note gives
    the answer and the count (`libraryThumbAutoAtom`, `previewCount`). Read the resolved answer
    from `libraryCardInfoAtom.preview`, never the stored value. Whenever thumbnails are drawn,
    by Auto or On, every card keeps the slot, with a `QuietMark` where there is no preview; a
    grid row never mixes shapes. Off drops the slot from every card.
  - Frame (`libraryThumbFrameAtom`) is one choice per grid. Portrait is `aspect-[3/4]` with
    narrower columns (`cardGridCols`); Size sets the column count.
  - Fit (`libraryThumbFitAtom`): `auto` covers when the image's orientation matches the frame
    and mats otherwise; `cover` fills; `contain` mats.
  - Every box has a definite size before load. The list chip is always square.
  - A document shows its whole first page, filling the portrait slot from the top. In the
    landscape band and the list chip (`fromText`) the sheet starts just above the page's first
    line, measured per bitmap (`pdfThumbInk`), because the band otherwise showed blank margin.
  - `PdfPageThumb` rasterises at the live box width and records it in `data-thumb-w`. Its
    IntersectionObserver uses the nearest scroller as root; with the viewport as root the
    600px margin never applied inside the Library pane. A failed render is not cached.
  - PDF thumbnails do not render in a background tab; use `scripts/check-thumbs.ts`.

### Notifications and Bert
- `Beacon` (navbar right cluster) is the indicator; `NotificationsSlideOver` is the log.
  - Beacon: a `rounded-md bg-warm` button with no edge, showing the `UwaziLoader` mark coloured by
    the most urgent unread item (seal, amber, carbon, ink), animated only while a task runs. It
    expands for a new task, on hover and on a flash, and collapses on phones.
  - Drawer: Tasks (`tasksAtom`) then notifications grouped New / Today / Earlier, cards
    tinted by kind, Retry on errors, Mark read, dismiss, Clear all. Opening does not mark read.
  - Toasts: the Beacon drains `toastsAtom` into notifications. `ToastContainer` renders only in
    the catalog.
- Bert (`components/agent/AgentModal.tsx`, `atoms/agent.ts`): "Ask Bert" or ⌘K / Ctrl K. The name
  shows in the UI; code keeps `agent*`. Identity is `BertMark` (two squares); `UwaziLoader` means
  working. Replies are mocked and streamed. Context is a narrowing chain (`agentScopeAtom`,
  `agentChainAtom`). Dropdowns portal because the modal clips.

### Other surfaces
- Files view: `focusedId` (the open file) is separate from `selectedIds` (checkboxes). The drawer
  shows the open file when nothing is ticked.
- Import CSV: imports are a per-corpus store (`atoms/csvImports.ts`, seed in `data/imports.ts`,
  Sample only) with Uwazi's stages and copy. `useCsvImportRunner` (mounted by `App`) moves every
  unfinished import and keeps one Beacon task each, whatever view is open. The list is a
  `SettingsListPage`, the status page a `SettingsContent`; Cancel and "Download failed rows" are
  on its footer. Admins only, from Tools and the Library footer.
- Metadata extraction: extractors and suggestion states are per-corpus stores (`atoms/extraction.ts`).
  Suggestion rows are derived from the entities (current value read through the entity overlay);
  Accept writes the entity (G12). Train and process runs are timers with one Beacon task each;
  the page restarts a run that a reload interrupted. No Reject, no "Accept all".
- Nepal protests 2024–2026 (`data/nepal/`, `public/nepal-data/`): a real open-source corpus,
  built from Research's seed by `scripts/build-nepal-corpus.mjs` (the seed lives in the main
  checkout's `dev/results/nepal-seed`, outside git). Rerun the script; do not edit the JSON.
  The build enforces the privacy rules (no named minor or withheld casualty, no phone or
  e-mail). Verification is the first property facet (`defaultfilter`), after Status, Template
  and Content, the order Uwazi gives built-in and property filters. Its List opens on its own columns
  (`COLLECTION_COLUMNS` and `listCells` in `listColumns.tsx`). A reference's quote is a search
  field ("Quote" on the source, "Source quote" on its target), so search and Results snippets
  reach it through `entitySearchFields`, with no second index.
  - Documents: 23 Government of Nepal PDFs, unaltered, in `public/nepal-data/docs/`; their
    per-page OCR text, issuer and source in `docs.json`. 51 records (sources and the actions they
    record) have one as primary document. The OCR text is the rendition and the search text.
    A reference whose quote was found in a PDF carries `file` and `page`; the page tag shows
    only on a record that displays that PDF.
  - Media items (`nepal_media`): the record leads with `MediaItemCard` (its own chunk, preloaded
    when the collection loads); the properties in `MediaItemView.covers` are not repeated as
    fields. A bundled image always shows attribution and licence, in the lightbox too
    (`EntityImage.credit`). `graphic` / `distressing` items are covered until revealed and never
    show a picture on a Library card. `misattributed` opens with an amber note and its
    fact-checks. The record's document and media builders (`profileParts.ts`) load with the
    corpus.
  - `[data-covered]` belongs to the overlay stack (`index.css` hides everything under it);
    a component's own covered state uses another attribute.
  - The build also stops on a bundled image without licence, licence link or attribution, a
    document without issuer or source URL or listed as link only, and a contact in document
    text that is not an institution's.
- Paragraph extraction: extractors and per-entity statuses are per-corpus stores
  (`atoms/paragraphExtraction.ts`); paragraphs are derived per entity. A target template needs a
  rich text and a numeric property; only Red Travesía has one, so it holds the seed and the
  Sample starts empty, with the wizard saying what a target needs.
- Catalog: the logo toggles `ComponentCatalog`. Add shared components as a `CatalogEntry` with a
  live demo.
- Mobile: `<768` / `768–1023` / `≥1024` (`atoms/viewport.ts`). On phones every nested view is a
  bottom sheet, and sheets stack: `sheetStackAtom` (`atoms/sheetStack.ts`) holds the open layers
  and `useSheetLayer` registers one. `MobileBottomSheet` and `Modal` both register, so a dialog
  opened from a sheet is the next layer. Desktop never registers.

## Performance traps
- `filterState` in `LibraryView` stays memoised and keyed on content (`activeTypeIds.join(",")`,
  …). Four full-corpus memos depend on it.
- `ResultsBody` is `memo`'d and its callbacks are `useCallback`'d at the call site; an inline
  arrow there undoes the memo.
- `EntityCard` receives the deferred query as a prop and does not subscribe to `libraryQueryAtom`.
- Per-keystroke cost is React re-rendering, not the text scan. Do not optimise the scan.

## Where context lives
- Auto-memory: `~/.claude/projects/-Users-juanmnl-Developer-huridocs-uwazi-app/memory/`.
  `MEMORY.md` is the index and marks the current handoff.
- `handoff/`: the migration kit for huridocs/uwazi (`production`); `PATTERNS.md` is the external
  copy of the accessibility and interaction rules above.
- Figma: [Uwazi v3 — Screens](https://www.figma.com/design/5VSISGr1dSEKi1dGG5Noft).
- Screenshots: `images/screens/prototype/`, `images/screens/import_csv/`.
- Do not create planning or decision docs unless asked.
