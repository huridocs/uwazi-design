# Uwazi 2026 prototype — Claude handoff

> If you're picking this up in a fresh session, read this once. It captures decisions and patterns that aren't obvious from the code.

## Stack
- **Vite + React 18 + TypeScript + Tailwind v4 + Jotai**, mock data only.
- Dev: `cd app && npm run dev` → http://localhost:5173.
- Type check: `cd app && npx tsc --noEmit`.
- No backend, no router — `views/` are page-level orchestrators switched via top-level state.

## Working with the user
- **Terse, directive**, expects you to infer scope. Iterates visually — image-driven feedback is the norm.
- Communicates in brand terms: "ink" (text/black), "stamp" (seal/red), "parchment"/"vellum"/"paper"/"warm" (warm neutrals), "carbon" (data/blue accent).
- "Calm and editorial" feel. Ink is primary; Seal is for danger only. Semantic colours (amber warning, green success, red danger) stay as-is.
- Asks for changes, not designs — show, don't deliberate. After a non-trivial edit, prefer to commit on request rather than waiting.

## Style rules that bite
- **Layout in `rem`, never `px`.** Tailwind spacing utilities (`px-4`, `gap-3`) are fine. Reserve raw `px` for borders, shadows, sub-pixel details.
- **No thick left-border accents** on cards or sidebar items. Use a small dot, an icon colour, or a bg tint.
- **Selected card state = `bg-parchment`** (#F5F0E8). Don't reach for inline `color-mix`, `bg-warm`, or `bg-vellum`.
- **Badges are `w-fit`** so they don't stretch in flex/grid.
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

The prototype keeps a simpler shape: every row in `data/references.ts` is a `Reference` with a required `sourceSelection` (text anchor) plus `sourceEntityId` (always the current doc), `targetEntityId`, `relationType`, and `direction`. What we call a `Relationship` (`utils/relationships.ts`) is **runtime aggregation** — `deriveRelationships(refs)` collapses by `(targetEntityId, relationType, direction)` and exposes `evidenceCount` + `refIds[]`. It is not stored.

**Property cheat sheet:**

| Property | `Reference` (per evidence) | `Relationship` (aggregate) |
|---|---|---|
| `id` | per ref | composite `target::type::direction` |
| `targetEntityId` | required | required |
| `relationType` | required | required |
| `direction` | optional, default `outgoing` | propagated |
| `sourceSelection` (text+page+box) | required — the text anchor | — |
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
- We always anchor source to the current document; Uwazi's `from`/`to` are symmetric. So "target-side text anchor" (a quote on the *target's* document) doesn't exist in our seed data, and grouping/filtering by target-side text would be empty.
- No inverse relation labels — Uwazi v2 stores a single `type` per relationship; the "source rel type vs target rel type" pair from the mockup has no backing data.
- No `createdBy`, `sourceKind` (manual / IX-suggested), or confidence on refs. If we add filters by source/author/confidence, the data layer has to grow first.
- No no-anchor relationships in seed data — every relationship has at least one underlying reference. A manual entity link with no quote is representable (`Reference` requires `sourceSelection` so… not actually representable without loosening the type). Future expansion if we model it.

## Connections panel — refs and rels are one surface

The Relationships top tab is the single surface, hosting both the text-anchored (snippet + page) and aggregated (entity-level) projections of the same `references[]` array. Both the main view and the document-tab drawer route through the same body.

```
src/components/connections/
  ConnectionRow.tsx              // discriminated union: kind="reference" | kind="aggregate"
  ConnectionGroupedCard.tsx      // shared group shell (expand/collapse signal, refIdsToWatch)
  ConnectionsPanelBody.tsx       // filter pipeline + body switch on panelModeAtom
  ConnectionsDrawerSection.tsx   // drawer-flavour wrapper: toolbar + body + scoped drawer
  PanelModeControls.tsx          // 5-way pill driving panelModeAtom
  DirectionGlyph.tsx             // shared arrow badge
src/views/
  ConnectionsView.tsx            // the merged main-tab surface (Relationships tab)
src/components/shared/
  ListInfoRow.tsx                // count + chips + rightSlot
  ListCardRow.tsx                // forwardRef shell, owns selected/hover/focus
  Checkbox.tsx                   // single shared native checkbox
  FiltersDrawer.tsx              // slide-over scoped to relative parent
  FiltersButton.tsx              // size="sm" → h-6, size="md" → h-8
  FacetSection.tsx               // checkbox group with counts
  ActiveFilterChip.tsx
  FadeTruncate.tsx
src/components/references/
  SearchBar.tsx                  // has rightSlot AND inlineSlot
  FiltersRow.tsx                 // exports ViewModeControls (legacy) + CollapseControls
  ZoomControl.tsx                // detail / compact / overview (graph is now a PanelMode)
  RelationshipsTreeView.tsx      // tree body — its target cards use ConnectionRow kind="aggregate"
  RelationshipsGraphView.tsx     // radial SVG body
```

`PanelMode = "list" | "by-entity-type" | "by-relation-type" | "tree" | "graph"`. The zoom toggle (`detail` / `compact` / `overview`) is orthogonal — applies to grouped + tree, hidden in list + graph.

Atom rename history: `relationshipTypeFiltersAtom` → `relTypeFiltersAtom`, `relationshipEntityTypeFiltersAtom` → `entityTypeFiltersAtom`, `relationshipsZoomAtom` → `zoomAtom`, `relationshipsActiveFilterCountAtom`/`referencesActiveFilterCountAtom` → `activeFilterCountAtom`. Removed: `viewModeAtom`'s `density` and `by-document` variants, `DensityCard`.

Toolbar pattern (main view):
```tsx
<SearchBar
  inlineSlot={<ActiveFilterChips />}
  rightSlot={
    <>
      <PanelModeControls />
      {showZoom && <ZoomControl />}
      <FiltersButton size="sm" activeCount={n} onClick={…} />
    </>
  }
/>
```

Drawer flavour stacks the controls vertically and uses `size="sm"`.

Card-row pattern:
```tsx
<ConnectionRow kind="reference" ref={ref} onDelete={…} />
<ConnectionRow kind="aggregate" rel={rel} expanded={…} onToggleExpand={…} />
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
Mirrors Uwazi's relationship properties: a field that connects this entity to
entities of a target template via a relation type and optionally **inherits** one
*native* property from each connected entity (single-level only — never inherit an
inherited value). Several fields sharing a `connectionKey` = **one connection, many
inherited columns** (multi-inheritance), edited together.
- **Data**: `MetadataField` got a sibling `RelationshipMetadataField` (`type:
  "relationship"`, `relationType`, `targetTypeId`, `inheritProperty?`,
  `inheritLabel?`, `connectedEntityIds`, `connectionKey?`); union `AnyMetadataField`.
  `metadataFieldsByLanguage` is now `AnyMetadataField[]` (= scalar fields +
  `relationshipFieldsByLanguage`). Source values live in **`data/entityMetadata.ts`**
  (`entityMetadataByLanguage`, `getEntityProp`) — entities themselves stay
  id/title/type. **Consumers that read `.value` must filter relationship fields out**
  (a `(f): f is MetadataField => f.type !== "relationship"` guard) — done in
  `MetadataView` read+edit bodies and `MetadataDrawerContent` (drawer stays scalar).
- **Resolve/group**: `utils/inheritance.ts` — `resolveRelationshipField` (→ values +
  provenance), `groupConnections` (buckets by `connectionKey` → `ConnectionGroup`s +
  standalone `singles`), `relationLabel`.
- **Read UI** (`MetadataReadBody`): hybrid — `ConnectionGroupCard` (a table, entities
  once × inherited columns) for shared connections, `RelationshipFieldCard` for
  singletons. Each value = `EntityPill` (click → source preview) + a carbon `Link2`
  "inherited" marker; missing value → em-dash with a provenance title.
  `components/metadata/{InheritedValueChip,ConnectionGroupCard,RelationshipFieldCard}`.
- **Edit UI** (`MetadataEditBody`): inherited values are **read-only**;
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
