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

## Connections panel — refs and rels are one surface

There is **no longer a separate "References" tab**. The Relationships top tab is the single surface, hosting both the text-anchored (snippet + page) and aggregated (entity-level) projections of the same `references[]` array. Both the main view and the document-tab drawer route through the same body. This mirrors Uwazi v2's data model, where a `Relationship` has `from`/`to` pointers that may optionally carry text-anchor `{file, selections[], text}`.

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

## Files view
- `focusedId` (single click on row) is separate from `selectedIds` (checkboxes).
- Default focus = `files.find(f => f.isDefault) ?? files[0]`.
- Drawer shows focused file when no checkboxes are ticked.
- Selected rows use `bg-parchment`. No inset blue accent.

## Metadata view
- Drawer tabs: **Document → Connections → Files → Template** (Document is first by request).
- Files tab maps over real `files[]` from `data/files.ts` — *not* hardcoded.
- Connections tab inside the drawer renders `<ConnectionsDrawerSection />`; default panel mode is `tree`.

## Import CSV
The 5 sample rows in `data/imports.ts` are seeded to match `images/screens/import_csv/*.png`. Status set: `completed`, `processing`, `failed`, `completed_warnings`, `completed_errors`, `uploading`, `pending`. `pending` rows render with a grey StatusBadge, grey ProgressBar, em-dashes for entities/failed, and a disabled View button.

`ImportEntry` carries optional detail-view fields (`totalRows`, `createdBy`, `time`, `sourceKind`, `sourceSizeKb`, `thesauriTouched`, `relationshipsCreated`, `filesExtracted`, `thesauriObserved`, `thesauriCreated`). Progress label uses `totalRows` when present (gives the "412/634" style).

`ToolsActionBar` has `mode: "list" | "detail"`. Detail mode = "Back to list" + "Delete Import" with its own confirm dialog. List-mode "New Import" is a solid `bg-ink` button.

## Component catalog
Logo click toggles in/out of `ComponentCatalog`. Sidebar groups: Style Guide, Elements, Entity View — Layout / Document / References / Metadata / Files / Drawer / Relationships, Import CSV — Layout / Components, **Filters & Lists**, Shared. Add new shared/connections components here as a `CatalogEntry` with a live `Isolated…` demo. Note: the Entity View → References + Relationships groups now both showcase `ConnectionRow` (reference and aggregate variants) and `ConnectionGroupedCard`.

## Mobile
Breakpoints: mobile `<768`, tablet `768-1023`, desktop `≥1024` (`atoms/viewport.ts`). `AdaptiveSplitView` swaps to `MobileBottomSheet` on mobile. Outstanding mobile follow-ups in `~/.claude/projects/-Users-juanmnl-Documents-Claude-uwazi-2026/memory/pending.md` — read before touching mobile.

## Where the long-lived context lives
- **Auto-memory**: `~/.claude/projects/-Users-juanmnl-Documents-Claude-uwazi-2026/memory/`
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
