# Uwazi 2026 prototype — Claude handoff

> If you're picking this up in a fresh session, read this once. It captures decisions and patterns that aren't obvious from the code.

## Stack
- **Vite + React 18 + TypeScript + Tailwind v4 + Jotai**, mock data only.
- Dev: `cd app && npm run dev` → http://localhost:5173.
- Type check: `cd app && npx tsc --noEmit`.
- No backend, no router — `views/` are page-level orchestrators switched via top-level state.
- **Storybook 10** (react-vite + a11y + docs): `cd app && npm run storybook` → :6006.
  Stories in `app/src/stories/*.stories.tsx`; `.storybook/preview.tsx` imports
  `src/index.css` (real tokens) and has a light/dark toolbar that flips `:root.dark`.
  New shared primitives get BOTH a story and a CatalogEntry.
  **Story names stay generic** (Default, Minimal, AllStates, Empty…) — never
  domain-specific ("PersonEntity", case names). Domain strings are fine as
  demo DATA, not as export/story names.

## Style handoff → huridocs/uwazi
`handoff/` holds the migration kit for the real repo (branch `production`, also
Tailwind v4 + Storybook 10): `uwazi-semantic-tokens.css` (PR-ready additive token
layer, scoped to their `.tw-content`) and `TOKENS-MAPPING.md` (token map — e.g.
carbon replaces their `primary-700 #2b56c1` —, the two-layer var rule, phase plan).
Keep it in sync when tokens.css or the style rules change.

## Working with the user
- **Terse, directive**, expects you to infer scope. Iterates visually — image-driven feedback is the norm.
- Communicates in brand terms: "ink" (text/black), "stamp" (seal/red), "parchment"/"vellum"/"paper"/"warm" (warm neutrals), "carbon" (data/blue accent).
- "Calm and editorial" feel. Ink is primary; Seal is for danger only. Semantic colours (amber warning, green success, red danger) stay as-is.
- Asks for changes, not designs — show, don't deliberate. After a non-trivial edit, prefer to commit on request rather than waiting.

## A11y patterns (post-audit, 2026-07 — don't regress these)
- **Rows/cards with nested controls are NEVER `role="button"`.** The shells
  (`ListCardRow`, `EntityCard`, `DataTable` rows, `ImportTable` rows) render a
  stretched invisible **primary-action button** as first child (focus ring,
  `aria-pressed`, accessible name, native Enter/Space); content sits above it in
  a `relative` wrapper so nested controls stay clickable, and the container keeps
  a plain `onClick` for mouse. Copy this pattern for any new clickable row.
- **Always-mounted slide-overs get `inert` while closed** (FiltersDrawer,
  NotificationsDrawer, EntityOverlay do this via `toggleAttribute("inert")`).
  Without it, tabbing into the closed drawer's controls force-scrolls the
  overflow-hidden pane and visually parks the drawer over the content.
- **Overlays trap focus**: `hooks/useFocusTrap.ts` — attach to the PANEL, wraps
  Tab, restores focus to the trigger on close. Used by ConfirmDialog, AgentModal,
  NotificationsDrawer, FiltersDrawer, EntityOverlay. New modals get it + Escape.
- **Hover-revealed actions** need `group-focus-within:opacity-100` next to
  `opacity-0 group-hover:opacity-100`, or keyboard users focus invisible buttons.
- **SVG interactive elements** (graph nodes/labels) get `tabIndex`, `role`,
  `aria-label`, Enter/Space, and a drawn focus ring (carbon halo) — never rely on
  default outlines inside the zoom transform.
- **EntityPill labels never use the raw type colour** — pale → ink, saturated →
  `color-mix(… 70%, var(--text-primary))` so small text clears WCAG on the tint
  in both themes. The dot keeps the true colour.
- Live updates (streams, toasts, task progress) get `aria-live="polite"` /
  `role="status"`/`role="log"` — see Beacon/AgentModal/ToastContainer.
- The Storybook a11y addon checks every story; keep new primitives violation-free.

## Style rules that bite
- **Layout in `rem`, never `px`.** Tailwind spacing utilities (`px-4`, `gap-3`) are fine. Reserve raw `px` for borders, shadows, sub-pixel details.
- **No thick left-border accents** on cards or sidebar items. Use a small dot, an icon colour, or a bg tint.
- **Selected card state = `bg-parchment`** (#F5F0E8). Don't reach for inline `color-mix`, `bg-warm`, or `bg-vellum`.
- **Badges are `w-fit`** so they don't stretch in flex/grid.
- **Never shift layout on state change.** A row that appears only when it has
  something to say (an "N active / Clear all" summary, a count line, a chip row)
  must stay MOUNTED at a fixed height with only its contents toggling — a
  conditional mount inside a scrollable column shoves everything below it the
  moment a user ticks a box. Reserve the space; don't grow into it.
- **Active sidebar items**: `bg-warm text-ink` with the *same* icon colour as inactive. Background change alone signals state.

## CSS tokens — use real names

The Tailwind aliases (`--color-ink`, `--color-paper`, `--color-vellum`, `--color-warm`) are **bridges**, not the canonical raw vars. The actual vars (light/dark aware) are:

| Concept | Var | Tailwind |
|---|---|---|
| primary text | `--text-primary` | `text-ink` |
| secondary text | `--text-secondary` | `text-ink-secondary` |
| tertiary text | `--text-tertiary` | `text-ink-tertiary` |
| muted text | `--text-muted` | `text-ink-muted` |
| paper bg | `--bg-surface` | `bg-paper` |
| warm bg | `--bg-warm` | `bg-warm` |
| vellum bg | `--bg-muted` | `bg-vellum` |
| parchment bg | `--bg-primary` | `bg-parchment` |
| selected bg | `--bg-selected` | `bg-selected` |
| border | `--border-primary` | `border-border` |
| soft border | `--border-soft` | `border-border-soft` |

**Never write `var(--ink, #1c1712)` / `var(--bg-paper, #fff)` / `var(--bg-vellum, …)`.** Those vars don't exist; only the fallback hex paints, which silently breaks dark mode. Default to Tailwind utilities; if you need raw `var(...)` (typically inside SVG `fill`/`stroke` or `style={{}}`), reference the real names above with no fallback.

## SVG canvases (the Relationships graph)
- **Wheel zoom**: React's `onWheel` is passive since v17. Attach a native listener with `{ passive: false }` or browser page-zoom kicks in past the clamp. See `RelationshipsGraphView.tsx` for the pattern.
- **Tooltips**: render as HTML overlays positioned by `getBoundingClientRect`, not as SVG elements inside the zoom transform. SVG tooltips scale with the graph and clip at viewport edges.
- **Layout**: branches occupy angular sectors, nodes fan out across concentric arcs (capacity scales with arc length). Edges are tree-style: source → label → fan to children.

## Reference vs Relationship — one record, two projections

Uwazi v2's data model is a single `Relationship { from, to, type }` where each pointer may optionally carry a text anchor `{file, selections[], text}`. A row is "text-anchored" iff either endpoint has selections. There is no separate "References" collection — text references and entity-to-entity edges are the same record, viewed differently.

The prototype keeps a simpler shape: every row in `data/references.ts` is a `Reference` with an **optional** `sourceSelection` (text anchor — absent = pure entity link) plus `sourceEntityId` (always the current doc), `targetEntityId`, `relationType`, `direction`, and optional `hubId`. What we call a `Relationship` (`utils/relationships.ts`) is **runtime aggregation** — `deriveRelationships(refs)` collapses by `(targetEntityId, relationType)` (direction is NOT in the key: incoming+outgoing to the same target/type merge into one bidirectional row via `directions[]`) and exposes `evidenceCount` + `refIds[]`. It is not stored. Full dev-facing writeup: `handoff/DATA-SEAMS.md`.

**Property cheat sheet:**

| Property | `Reference` (per evidence) | `Relationship` (aggregate) |
|---|---|---|
| `id` | per ref | composite `target::type` |
| `targetEntityId` | required | required |
| `relationType` | required | required |
| `direction` | optional, default `outgoing` | first seen; `directions[]` holds all (len 2 = bidirectional) |
| `sourceSelection` (text+page+box) | optional — the text anchor | — |
| `targetSelection` | optional (never populated today) | — |
| `evidenceCount` | — | `refIds.length` |
| `firstPage` | — | `min(ref.page)` |
| `refIds` | — | backing references |

**Where the seam shows up in the UI:**
- List view rows = `Reference[]` (one per evidence, snippet + page tag).
- Tree view leaves = `Relationship[]` (deduped aggregates) with inline-expand into their underlying refs.
- Graph nodes = `Relationship[]`.
- Header counter always shows the **aggregate** count (`deriveRelationships(filtered).length`) so list and tree numbers agree.
- The aggregate row's "evidence count" badge is `relationship.evidenceCount`.

**Known gaps vs Uwazi v2 (intentional, don't paper over):**
- ~~Target-side text anchors don't exist in seed data~~ **Partially closed
  (2026-07-08):** `ref-tt-1..3` seed text↔text references (BOTH endpoints
  anchored, mirroring v2's symmetric `from`/`to`); rows + the entity overlay
  render the target quote as a second warm/italic snippet ("target p.N" /
  "here p.N"). Still open: jump-to-target-passage navigation, and
  grouping/filtering by target-side text.
- No inverse relation labels — Uwazi v2 stores a single `type` per relationship; the "source rel type vs target rel type" pair from the mockup has no backing data.
- No `createdBy`, `sourceKind` (manual / IX-suggested), or confidence on refs. If we add filters by source/author/confidence, the data layer has to grow first.
- No-anchor relationships ARE representable now (`sourceSelection` is optional; `firstPage` stays undefined when no backing ref is anchored) — seed data just has few of them.

## Connections panel — refs and rels are one surface

The Relationships top tab is the single surface, hosting both the text-anchored (snippet + page) and aggregated (entity-level) projections of the same `references[]` array. Both the main view and the document-tab drawer route through the same body.

```
src/components/relationships/
  RelationshipRow.tsx            // discriminated union: kind="reference" | "aggregate" | "hub"
  RelationshipGroupedCard.tsx    // shared group shell (expand/collapse signal, refIdsToWatch)
  RelationshipsPanelBody.tsx     // body switch on viewAtom; filters via useFilteredReferences
  useFilteredReferences.ts       // THE filter pipeline (cluster→facets→search→sort) —
                                 // List, Tree, AND Graph all consume this one hook
  RelationshipsDrawerSection.tsx // drawer-flavour wrapper: toolbar + body + scoped drawer
  ViewControls.tsx               // list | tree | graph pill driving viewAtom
  GroupByControl.tsx             // grouping axis (+ subGroupBy "Then by")
  DirectionGlyph.tsx             // shared arrow badge
  SearchBar.tsx                  // has rightSlot AND inlineSlot
  FiltersRow.tsx                 // exports CollapseControls
  ZoomControl.tsx                // detail / compact / overview
  RelationshipsTreeView.tsx      // tree body — target cards use RelationshipRow kind="aggregate"
  RelationshipsGraphView.tsx     // radial SVG body
  RelationshipsFilterDrawer.tsx  // facet drawer (self-hides empty facets)
src/views/
  RelationshipsView.tsx          // the merged main-tab surface (Relationships tab)
src/components/shared/
  ListInfoRow.tsx                // count + chips + rightSlot
  ListCardRow.tsx                // forwardRef shell, owns selected/hover/focus
  Checkbox.tsx                   // single shared native checkbox
  FiltersDrawer.tsx              // slide-over scoped to relative parent (RTL-aware)
  FiltersButton.tsx              // size="sm" → h-6, size="md" → h-8
  FacetSection.tsx               // checkbox group with counts
  ActiveFilterChip.tsx
  FadeTruncate.tsx
```

`View = "list" | "tree" | "graph"` (`viewAtom`); grouping is orthogonal via `groupByAtom`/`subGroupByAtom`. The zoom toggle (`detail` / `compact` / `overview`) applies to grouped + tree, hidden in list + graph. **Never re-implement filtering in a view body — consume `useFilteredReferences` so facets can't silently drop in one mode.**

Atom rename history: `relationshipTypeFiltersAtom` → `relTypeFiltersAtom`, `relationshipEntityTypeFiltersAtom` → `entityTypeFiltersAtom`, `relationshipsZoomAtom` → `zoomAtom`, `relationshipsActiveFilterCountAtom`/`referencesActiveFilterCountAtom` → `activeFilterCountAtom`. Removed: `viewModeAtom`'s `density` and `by-document` variants, `DensityCard`.

Toolbar pattern (main view):
```tsx
<SearchBar
  inlineSlot={<ActiveFilterChips />}
  rightSlot={
    <>
      <ViewControls />
      {showZoom && <ZoomControl />}
      <FiltersButton size="sm" activeCount={n} onClick={…} />
    </>
  }
/>
```

Drawer flavour stacks the controls vertically and uses `size="sm"`.

Card-row pattern:
```tsx
<RelationshipRow kind="reference" ref={ref} onDelete={…} />
<RelationshipRow kind="aggregate" rel={rel} expanded={…} onToggleExpand={…} />
```

In tree mode, target cards are aggregate rows with inline-expand revealing their underlying ref rows. Selected state is read internally from `overlayEntityIdAtom` (aggregate) or `activeRefIdAtom`+`overlayEntityIdAtom` (reference).

## Document tab — format renditions & language
- The DocMeta header picker (`showPdfSelector`, Document tab only) switches the
  **rendition** of the *one default primary document*, not between documents:
  `documentFormatAtom` = `"pdf" | "text" | "html"` (`atoms/selection.ts`).
- `DocumentViewer` keeps the PDF **mounted** and just hides it (`hidden`) behind
  a rendition, so returning to PDF repaints instantly (don't unmount the
  `<Document>` — remount leaves canvases blank). The ResizeObserver ignores the
  0-width report while hidden.
- `DocumentRendition` (text / HTML) fills the pane on `bg-paper` (no vellum
  "desk" — that left a gap on wide panes) with a centred `max-w-[44rem]` column.
  `ActionBar` takes `showPager` (false for non-paginated renditions) and
  `rightSlot` (the mobile sheet trigger).
- Rendition text lives in `data/velasquez-judgment-{en,es,fr,ar}.txt`, imported
  `?raw` (needs `src/vite-env.d.ts`), parsed by `parse()` in
  `data/documentRenditions.ts` (any `^N. ` line starts a paragraph; standalone
  roman numerals are section heads). EN/ES are the real extracted judgments
  (¶1–194); FR/AR are representative translations (no genuine source PDF). AR
  renders RTL.
- **Language = reading language of the *same* document.** All four languages
  stay on the Velásquez judgment so references stay aligned; EN/ES have real
  PDFs, FR/AR fall back to the EN PDF for the PDF view. Don't re-point FR/AR at
  the Bámaca files — that's what made references "change" by language.

## Notifications — the navbar Beacon + drawer
Two pieces: the **pill** (`components/layout/Beacon.tsx`) is the indicator; the
**drawer** (`components/layout/NotificationsDrawer.tsx`) is the history log.
Modelled on the real Uwazi notification drawer (tasks + tinted severity cards +
expandable stack traces + Clear).

- **Pill** — lives in the navbar **right cluster** (with Settings/theme), an
  inline `rounded-md bg-warm` button (matches the borderless action buttons in the
  bottom `ActionBar`; **don't** give it a border or make it a pill/circle). It
  animates `width` (`beacon-spring`). The icon is always the **`UwaziLoader` mark**
  (not a bell), coloured by the most pressing state and animated **only** while a
  task runs:
  - colour ladder (`loaderColor`, derived from `topUnread`): seal = unread error,
    amber (`warning`) = unread warning, carbon = unread info / **processing**,
    black (`default`) = idle or "done" (only an unread success left). `UwaziLoader`
    gained `color` tones (`muted`/`carbon`/`seal`/`warning`) + an `animate` prop.
  - **collapse / expand** (desktop): collapsed = just the mark. A starting task
    expands the rail for ~3s (`activityIntro`) showing label + `%`, then
    auto-collapses; **hover** re-expands — to the live label+`%` if a task runs,
    else to the top unread item (severity-sorted) with its kind icon + `+N`. Mobile
    stays collapsed (tap → drawer).
  - **flash** — action toasts briefly expand the rail with the message, then
    collapse (see consolidation). A springy **`animate-beacon-pop`** fires when the
    unread count rises. Respects `prefers-reduced-motion`. Click → `beaconOpenAtom`.
- **Drawer** — right slide-over (`fixed`, flips to left under RTL), scrim +
  Escape to close.
  - **Header**: title + unread count chip + **Mark all read** (opening no longer
    auto-marks read) + close. An **All / Unread** filter row (with counts).
  - **TASKS** section lists every `activitiesAtom` entry (multi-task) — loader mark
    + label + detail + Running/Finishing + cancel + progress + `%`.
  - **NOTIFICATIONS** grouped into **New** (unread) / **Today** / **Earlier**
    (read, by calendar day); sticky section labels. Unread filter shows only New.
  - Cards tinted by kind via real semantic tokens: success `bg-success-light`, info
    `bg-carbon-tint`, warning `bg-warning-light`, error `bg-seal-tint`. Read cards
    dim to `opacity-75`; unread carry a carbon dot. **Per-card actions**: error →
    **Retry** (marks read + pushes a fresh task), **Mark read** check, and a
    hover **dismiss** (animated collapse). New arrivals enter via `animate-fade-in-up`.
  - `Notification.details` (optional) → **Show/Hide details** monospace stack-trace.
    Timestamps relative (`3 min ago`, `2 hours ago`, `1 day ago`) then absolute
    (`dd/mm/yyyy, HH:MM`) past 7 days. Footer **Clear all** empties the log.
- State in `atoms/notifications.ts`: `notificationsAtom` (log),
  `activitiesAtom` (**`Activity[]`** — in-flight tasks; the beacon derives one
  combined indicator + aggregate `%`), `beaconOpenAtom`, derived `unreadCountAtom`.
  The beacon owns the task tick/completion sim; each finished task → a success
  notification (finalised once via a ref guard).
- **Toasts are consolidated into the beacon.** All the old `setToasts(...)`
  call-sites are untouched — the beacon *drains* `toastsAtom`: each toast becomes a
  persistent notification AND briefly flashes on the pill. The floating
  `ToastContainer` was removed from the app shell + EntityView; it survives **only**
  in the catalog view (App's `catalog` branch), where the beacon isn't mounted and
  `useCopyToast` still needs it.

## Bert — the agent assistant
A centered modal (`components/agent/AgentModal.tsx`, state in `atoms/agent.ts`)
mounted in `App` (both branches) so it opens from anywhere. **Named "Bert" as a
HURIDOCS tribute** — surface the name, keep the code identifiers (`agent*`).
- **Open**: navbar **"Ask Bert"** button (right cluster, *right* of the Beacon) or
  global **⌘K / Ctrl K** (handler binds meta+ctrl; `shortcutLabel` shows the right
  glyph per platform). Escape / scrim closes.
- **Identity = the two Uwazi squares** (Seal above Carbon) via the `BertMark`
  component — header lockup (staggered drop-in on open), empty state, and chat
  avatars. The 6-square `UwaziLoader` is reserved for the *working* indicator (send
  button while thinking). Don't use a generic sparkle/grid for Bert.
- **Replies are mocked** — streamed word-by-word, varied by intent
  (summarize/find/extract/relationship/default). A task-y prompt ("re-process…")
  pushes an `activitiesAtom` entry → tracked in the Beacon (close-and-keep-working).
- **Context = a dynamic chain**: `agentScopeAtom` (`auto/document/view/library/none`)
  sets the spine (Library › View › Document); `agentChainAtom` (`ChainNode[]`) appends
  nodes via **"+ Add"** → Deepen (Page/Selection), Facets (Template/Connections/Files),
  Attach (Entity…/File… via a search picker). Scope nodes follow the selector;
  appended nodes are removable. **No contradictory combos** (it's a narrowing chain,
  not arbitrary toggles). Context dropdowns render in a **viewport-clamped portal**
  (`createPortal`) because the modal is `overflow-hidden`.
- **Layout**: landscape on desktop (`max-w-[46rem]`, `max-h-[min(70vh,34rem)]`),
  anchored to the **lower third** (`items-end`, `pb-[8vh]`), gentle rise + fading
  scrim entrance (`animate-agent-modal` / `agent-scrim`, `index.css`), `px-5` content.
- Send button: arrow when idle (active = ink + white arrow on focus/text); the Uwazi
  mark animates while thinking. Input auto-focuses on open.

## Files view
- `focusedId` (single click on row) is separate from `selectedIds` (checkboxes).
- Default focus = `files.find(f => f.isDefault) ?? files[0]`.
- Drawer shows focused file when no checkboxes are ticked.
- Selected rows use `bg-parchment`. No inset blue accent.

## Metadata view
- Drawer tabs: **Document → Connections → Files → Template** (Document is first by request).
- Files tab maps over real `files[]` from `data/files.ts` — *not* hardcoded.
- Connections tab inside the drawer renders `<ConnectionsDrawerSection />`; default panel mode is `tree`.

### Relationship & inherited metadata
Mirrors Uwazi's relationship properties: a field connects this entity to entities of
a target template via a relation type and optionally **inherits** a value from each
connected entity. Inheritance is now **one spec, two shapes** (the second
generalises the first):
- `inheritProperty` — a *native* scalar prop on the connected entity (the classic
  single-hop lookup, Uwazi's model).
- `inheritPath` (`ChainSegment[]`) + `inheritLeaf` — a **multi-hop** projection:
  traverse the graph FROM each connected entity, project the leaf property.
  `inheritProperty` is the degenerate zero-segment case of this. **We DO inherit
  through hops now** (e.g. Causa's "Jueces firmantes" inherits each judge's País via
  `[Juez → País]`) — the old "single-level only" rule is gone.

Several fields sharing a `connectionKey` = **one connection, many inherited columns**
(multi-inheritance), edited together.
- **Data**: `RelationshipMetadataField` (`type: "relationship"`, `relationType`,
  `targetTypeId`, `inheritProperty?`, `inheritPath?`, `inheritLeaf?`, `inheritLabel?`,
  `connectedEntityIds`, `connectionKey?`, `reduce?`, `entityLabel?`,
  `connectionProvenance?`, `totalConnected?`, `readOnly?`); union `AnyMetadataField`.
  Scalar source values live in **`data/entityMetadata.ts`** (`entityMetadataByLanguage`,
  `getEntityProp` — native props ONLY now). **Consumers that read `.value` must filter
  relationship fields out** (`(f): f is MetadataField => f.type !== "relationship"`) —
  done in `MetadataView` read+edit bodies and `MetadataDrawerContent`.
- **Resolve (ONE path resolver)**: `utils/inheritance.ts` —
  `resolveInherited(connectedEntityId, spec, lang, getProp)` returns `{ value, steps }`: single-hop reads the native prop;
  multi-hop walks `chains()` (`utils/chainTraversal.ts`) and projects the leaf.
  `resolveInheritedValue` is the string-only wrapper. The backing graph is **injected**
  via `registerInheritanceGraph(provider)` (dependency inversion — inheritance.ts never
  imports CEJIL; `data/cejil/profile.ts` registers `cejilChainGraph`). `resolveRelationshipField`
  + `groupConnections` (buckets by `connectionKey` → `ConnectionGroup`s + `singles`) route
  through it. **The old `data/cejil/inheritedRegistry.ts` (pre-baked chain values) is
  DELETED** — chain-derived values resolve LIVE at render, not stored.
- **Provenance** (`ProvenanceStep` in chainTraversal.ts): a derived value carries the
  intermediary nodes it was reached through (the connection's hidden middleman, e.g. the
  Sentencia a judge signed — `field.connectionProvenance[id]` — plus value-side hops).
  Rendered as a clickable `↳ via …` `ProvenanceTrail`; when every row shares one
  signature it's **hoisted** to a single `all inherited via …` line.
- **Reduce/rollup**: `reduce?: InheritReduce` (`list|distinct|count|min|max|first`) →
  `reduceInherited()` → a carbon `Σ` `RollupChip` (Notion/Airtable "calculation"). Shown
  per-column on the grouped table and in the single card's value-column header.
- **Read UI** (`MetadataReadBody`): `ConnectionGroupCard` (a table, entities once ×
  inherited columns, cell-merged) for shared connections; `RelationshipFieldCard` for
  singletons — an **inheriting single now renders as the SAME bordered table** (entity
  column + value column, `entityLabel` names the entity col) rather than a floating
  2-col grid; link-only stays a pill list. `EntityPill` → source preview; missing value
  → em-dash. `components/metadata/{InheritedValueChip,ConnectionGroupCard,RelationshipFieldCard}`.
- **Edit UI** (`MetadataEditBody`): inherited values are **read-only** (derived/CEJIL
  fields carry `readOnly` and render as read cards, not editors);
  `RelationshipFieldEditor` (one per connection, keyed) edits the **connection** (entity
  picker filtered by `targetTypeId`); state is `connections: Record<key, ids>` so
  multi-inheritance siblings sync. Each row has **"Source"** → opens `EntityOverlay`
  (the "edit at source" route). The Metadata left pane is wrapped `relative
  overflow-hidden` with `<EntityOverlay />` mounted so the slide-in is contained.
- `EntityOverlay` now renders a **Properties** section from `entityMetadata` (the
  inheritable native values) — also visible from the Relationships view.
- `TemplateStructure` derives its Inherited group from the real relationship fields
  (no longer the hardcoded `mechanism`/`signatories` flags).
- Simplification vs. real Uwazi: connections are explicit `connectedEntityIds` on the
  field (not derived from `references[]`), so direction/inverse is sidestepped.

## Import CSV
The 5 sample rows in `data/imports.ts` are seeded to match `images/screens/import_csv/*.png`. Status set: `completed`, `processing`, `failed`, `completed_warnings`, `completed_errors`, `uploading`, `pending`. `pending` rows render with a grey StatusBadge, grey ProgressBar, em-dashes for entities/failed, and a disabled View button.

`ImportEntry` carries optional detail-view fields (`totalRows`, `createdBy`, `time`, `sourceKind`, `sourceSizeKb`, `thesauriTouched`, `relationshipsCreated`, `filesExtracted`, `thesauriObserved`, `thesauriCreated`). Progress label uses `totalRows` when present (gives the "412/634" style).

`ToolsActionBar` has `mode: "list" | "detail"`. Detail mode = "Back to list" + "Delete Import" with its own confirm dialog. List-mode "New Import" is a solid `bg-ink` button.

## Library search — where the evidence lives

Search matches can hide in a property or a document body. Three surfaces answer
"why is this row here?", all off ONE data path (`buildSnippetsFor` /
`matchCategories` in `utils/librarySnippets.ts`, tokenized by `utils/queryTokens.ts`):

- **`MatchOrigin`** (`components/library/MatchOrigin.tsx`) — the row-level mark for
  layouts with no room for a snippet: the **List table** (a 3.5rem "Match" column,
  mounted only while a query is active) and the **timeline Spine** (a fixed
  2.25rem slot at the row's end). Renders ONLY where the evidence is off-row —
  `hiddenMatchOrigin` takes the field keys the row already marks, **per row**
  (a Country column showing an em-dash proves nothing). Carbon `Tag` = property,
  `FileText` = document body; hover/focus builds that one entity's excerpt into a
  portalled popover, click routes to the field or the page. No page tag or jump
  where `page` is null.
- **Results view** — the drawer's evidence list promoted to the main pane as a 5th
  `libraryViewModeAtom` mode (`"results"`, always in the switcher; it renders its
  own no-query state rather than appearing when you type). Body:
  `components/library/ResultsSnippets/ResultsMainView.tsx`, layout picked in the
  Display menu via `libraryResultsLayoutAtom` — **grouped** (wide card, properties
  beside passages) / **tree** (entity → field → snippets) / **passages** (flat
  ranked passage list, entity secondary) / **spine** (best passage on a time axis).
  Every layout drops the TITLE snippet — each already prints the title marked.
  With the main pane in Results, a query no longer auto-opens the drawer's Results
  tab (two copies of one list).
- **`TimeSpine`** (`components/library/TimeSpine.tsx`) — ONE proportional
  chronology, rendered by both `LibraryTimelineView`'s Spine layout and the
  Results spine. It owns `useTrackGeom` (the axis inset the Rail and Density
  tracks share), the adaptive scale, year/month marks, elided-silence breaks,
  collision push, leader lines and `SpineDate`. Callers pass rows + `rowHeight` +
  `renderRow` and nothing else — **don't re-derive spine geometry anywhere.**

Match-type chips (Title / Properties / Document) are `ToggleChip`
(`components/shared/ToggleChip.tsx`) — `ActiveFilterChip`'s visual twin with
`aria-pressed` instead of an X — and ride the count row via `ListInfoRow`'s
`inlineSlot`, in both the drawer tab and the main view.

## Tab signals & recent searches

- **`count` vs `dot`** (`components/layout/DrawerTabs.tsx`, `MainTabs.tsx`): count =
  inventory, always present, in the flow (Relationships 10, Files 2). Dot = live
  user-set state behind an UNSELECTED tab, absolutely positioned so it can toggle
  without moving the strip. Wired to exactly two states — `activeFilterCountAtom`
  (every Relationships tab, all strips) and `docSearchQueryAtom` (the entity
  drawer's Search tab). Both strips dropped `overflow-hidden` so the dot isn't
  clipped; end tabs round themselves logically instead. The Library drawer's
  Filters/Results tabs use dots, NOT counts — the count mounted on first tick and
  shoved the next tab sideways.
- **Ending a search** — `clearLibrarySearchAtom` is THE dismiss, and every entry
  point routes through it: the active-filters sheet + action-bar popover (via
  `useActiveFilters`), the no-matches blank state, and now
  `components/library/ActiveSearchChip.tsx` — one component, owning the wiring,
  rendered by BOTH Results surfaces in their count row ("N results for
  [“query” ×]"). The chip REPLACES the quoted query in that sentence rather than
  sitting beside it. Don't add a second clear: two `clearAll`s over this state
  already drifted once (PATTERNS §4.3).
- **Recent searches** (`atoms/library.ts` → `librarySearchHistoryAtom`,
  `recordSearchAtom`; `components/library/RecentSearches.tsx`): committed queries
  recorded on SETTLE (1.2s debounce, plus Enter/blur), deduped case-insensitively,
  newest-first, capped at 8, in **sessionStorage** per `atoms/navigation.ts`'s
  reasoning. The panel follows FOCUS while `SearchTipsPopover` follows a CLICK on
  its chip — clicking the chip blurs the input, so the two can't both be open and
  need no shared state. Both portal to `body` and position from the box's rect.

## Component catalog
Logo click toggles in/out of `ComponentCatalog`. Sidebar groups: Style Guide, Elements, Entity View — Layout / Document / References / Metadata / Files / Drawer / Relationships, Import CSV — Layout / Components, **Filters & Lists**, Shared. Add new shared/connections components here as a `CatalogEntry` with a live `Isolated…` demo. Note: the Entity View → References + Relationships groups now both showcase `ConnectionRow` (reference and aggregate variants) and `ConnectionGroupedCard`.

## Mobile
Breakpoints: mobile `<768`, tablet `768-1023`, desktop `≥1024` (`atoms/viewport.ts`). `AdaptiveSplitView` swaps to `MobileBottomSheet` on mobile. Outstanding mobile follow-ups in `~/.claude/projects/-Users-juanmnl-Developer-huridocs-uwazi-app/memory/pending.md` — read before touching mobile.

## Where the long-lived context lives
- **Auto-memory**: `~/.claude/projects/-Users-juanmnl-Developer-huridocs-uwazi-app/memory/`
  - `MEMORY.md` (index, always loaded)
  - `session-handoff.md` (current state, recent commits, follow-ups)
  - `feedback-list-primitives.md`, `feedback-tokens-and-svg.md`, `feedback-styles.md` (load when relevant)
  - `prototype-state.md`, `text-references-feature.md`, `screens.md`, `figma-v3.md`, etc.
- **Figma**: [Uwazi v3 — Screens](https://www.figma.com/design/5VSISGr1dSEKi1dGG5Noft) is the design source.
- **Reference screenshots**: `images/screens/prototype/` (entity view) and `images/screens/import_csv/` (CSV flow). When the user says "match the screenshots", check these.

## Don't
- Don't introduce a new selected-state colour. It's `bg-parchment`.
- Don't add inset-border accents.
- Don't hand-roll a list info row or card shell — use the primitives.
- Don't write `var(--ink, …)`, `var(--bg-paper, …)`, `var(--bg-vellum, …)`. They don't exist.
- Don't put SVG tooltips inside the zoom transform.
- Don't rely on React `onWheel` to `preventDefault` — attach a native non-passive listener.
- Don't create planning/decision docs unless asked.
