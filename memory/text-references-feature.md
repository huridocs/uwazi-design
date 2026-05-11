---
name: text-references-feature
description: Text References track/minimap feature — architecture, patterns, component details, sync model
type: project
---

## Text References Track (RefMinimap)

### What it is
A vertical minimap track on the right side of the document viewer showing colored square markers for each text reference. Clusters nearby refs and expands them into a tree on click.

### Key files
- `app/src/components/viewer/RefMinimap.tsx` — the track component (squares, clusters, tree SVG, mode toggle)
- `app/src/components/viewer/PageHighlights.tsx` — highlight overlay on PDF pages (only shows when ref is active or flashing)
- `app/src/components/viewer/DocumentViewer.tsx` — hosts the RefMinimap, handles scroll-to-highlight centering
- `app/src/components/references/EntityOverlay.tsx` — slide-in overlay showing target entity details
- `app/src/components/references/RefRow.tsx` — reference row with View (eye) and Delete buttons
- `app/src/components/references/ReferencePanel.tsx` — drawer panel, reads activeClusterRefIds for filtering
- `app/src/views/ReferencesView.tsx` — References tab main view, also reads activeClusterRefIds

### Atoms & state
- `activeRefIdAtom` — currently selected reference ID (null = none)
- `scrollToHighlightAtom` — one-shot signal to scroll doc to a ref's highlight
- `scrollToRefAtom` — one-shot signal to scroll drawer to a ref row
- `overlayEntityIdAtom` — entity ID for the slide-in overlay (null = closed)
- `activeClusterRefIdsAtom` — IDs of refs in the expanded cluster (null = no cluster filter)
- `searchQueryAtom` — search text, shared between drawer SearchBar and track

### Sync model (track ↔ drawer)
- **Track → Drawer**: Expanding a cluster sets `activeClusterRefIdsAtom`, drawer filters to those refs only
- **Drawer → Track**: `searchQueryAtom` filters both the drawer list and the track dots/clusters
- **Deselect**: Clicking document background sets `activeRefId = null`, which clears expanded cluster and cluster filter

### Track behavior
- **Global mode** (Layers icon): dots positioned by `(page-1 + top) / numPages` across full document
- **Page mode** (FileText icon): only current page's refs, positioned by `top` value
- **Single refs**: colored squares (10px, rounded-[2px]) centered on track
- **Clusters**: bordered square with count, scales size with dot count (`CLUSTER_SIZE + scale * 4`)
- **Cluster expand**: click to toggle, shows SVG tree (stem → trunk → branches → dot squares)
- **Active states**: active dot gets ring shadow, active cluster gets stronger border + muted bg

### Highlight behavior
- Highlights on the document only show when a ref is active or during flash animation (1.2s)
- Flash clears when activeRefId changes (prevents stale highlights from previous selection)
- Scroll-to-highlight centers the highlight vertically in the viewport

### Style patterns (locked)
- All indicator dots/squares use `rounded-[2px]` — brand square aesthetic
- Tailwind radii overridden globally via `@layer theme` in index.css (2-3px range)
- Entity colors defined in `data/entities.ts` — purple is `#A78BFA` (bright enough for dark mode)
- Track line uses `var(--border-soft)` at 50% opacity
- Cluster tree lines use `var(--text-tertiary)` at 40% opacity
- All buttons get `cursor: pointer` via global CSS rule
- Search bars show X clear button when input has value
- EntityPill uses `rounded-md` with square color indicator `rounded-[2px]`
- Dark mode: all minimap elements use CSS custom properties that have dark mode values in tokens.css

### EntityOverlay
- Slides in from right over the drawer panel, width `calc(100% - 12px)`
- Shows entity type pill, metadata section, all references to that entity in current doc
- Reference cards inside match RefRow style (EntityPill + PageTag + quoted text + relation type)
- Triggered by Eye button on RefRow, closed by X or backdrop click
