# Uwazi 2026 — style migration: component inventory

Companion to [`TOKENS-MAPPING.md`](./TOKENS-MAPPING.md) (token layer + style rules). This
file maps the 2026 prototype's component surface (`app/src/components/{shared,relationships,metadata,layout}/`)
onto `huridocs/uwazi` (branch `production`) so a migrating dev knows, component by
component, whether they're reskinning something that already exists or building net-new.

> **Method**: shallow-cloned `huridocs/uwazi` at `production` (2026-07-20, commit
> `d3e86d9` "Bump version") into a scratch dir, read every file under
> `app/react/V2/Components/` + `app/react/V2/Routes/Entity/` + `app/react/stories/`,
> and paired each of the 85 prototype components in `shared/`, `relationships/`,
> `metadata/`, `layout/` against its closest counterpart by name and behavior.

## Headline finding: the surfaces have converged more than `TOKENS-MAPPING.md` implied

`TOKENS-MAPPING.md`'s "Where each side stands" table says Uwazi's components are
"flowbite-react + own V2 components" vs. the prototype's "hand-rolled primitives."
That's technically true but undersells how far apart they aren't:

- **flowbite-react's actual footprint is 5 files, repo-wide**: `Forms/MultiSelect.tsx`
  (flowbite `Checkbox`), `Forms/RadioSelect.tsx` (flowbite `Radio`+`Label`),
  `Layouts/SettingsContent.tsx` (flowbite `Breadcrumb`), `Components/UI/Tooltip.tsx`
  (flowbite `Tooltip`), `Routes/Entity/Components/ToC/ToCView.tsx` (flowbite `Tooltip`).
  Everything else — Button, Card, Modal, Table, Tabs, Drawer, Sidepanel, Pill,
  SegmentedControl, DataTable, the whole Relationships surface — is already
  hand-rolled. De-flowbiting is a small, contained job, not a sweep.
- **The Relationships surface is already a near 1:1 port** of the prototype's
  architecture: list/tree/graph view-switching, a radial SVG graph view, grouped
  cards with inline-expand, direction glyphs, group-by/sort/zoom controls as
  segmented dropdowns, a filter drawer, a sticky action bar — all present under
  `Routes/Entity/Components/relationships/` with matching decomposition. 16 of 29
  `relationships/` rows rated **S** (reskin only).
- **Beacon/Notifications and "Bert" are already named and structured the same way**
  in `production`: `Components/UI/Notifications/{Beacon,ThemedBeacon,BeaconShell,
  NotificationsPanel,TaskItem,...}` and `Components/AIAssistant/{BertModal,
  BertHost,AskBertButton,ChatMessage,...}`. The real Beacon already does
  hover-expand, task `%` progress, and severity-tinted marks; the real
  Notifications panel already buckets Today/Earlier and tracks task progress bars.
  This is either convergent design or the actual source the prototype started
  from — either way, migrating these two features is close to free.
- Storybook is **already 10.5.0** on both sides, so no addon/version bridging is
  needed — only story content.

The gap is concentrated in three places: (1) **inheritance/rollup UI in
Metadata** — the real repo's `Relationship.tsx`/`RelationshipCards.tsx` only do
Uwazi's classic single-hop `inheritProperty`, so every multi-hop/provenance/rollup
component in the prototype's `metadata/` is net-new; (2) **mobile chrome** — no
draggable bottom sheet, no per-section swap logic matching the prototype's
`<768/768-1023/≥1024` breakpoints; (3) a handful of **standalone shared primitives**
(`CountBadge`, `StatsCard`, `DocPlaceholder`, `PdfPageThumb`, `EntityTypeChip`)
that don't exist as reusable components anywhere in `production` yet.

## Difficulty scale

- **S** — near drop-in reskin. Counterpart already has equivalent structure/behavior; swap classes onto semantic tokens.
- **M** — same concept exists but needs real structural/behavioral rework (missing a11y pattern, reduced feature set, coupled to the wrong domain, or split across more files).
- **L** — no real counterpart, or a fundamentally different architecture/data model. New build.

## `shared/` (29 components)

| Prototype component | Uwazi counterpart | Story coverage | Flowbite dependence | Difficulty | Note |
|---|---|---|---|---|---|
| ActiveFilterChip.tsx | `UI/ActiveFilterChip.tsx` | Yes — `Components/UI/QuerySearchBar.stories.tsx` | None | S | Near-identical structure (dot, label, remove button); token swap only |
| AlertBanner.tsx | `UI/AlertBanner.tsx` | Yes — `Components/UI/Feedback.stories.tsx` | None | S | Byte-level equivalent markup/props; reskin only |
| Checkbox.tsx | `Forms/Checkbox.tsx` | Yes — `Forms/Checkbox.stories.tsx` | None | S | Same tone/accent API; repo version adds required label + indeterminate |
| ConfirmDialog.tsx | `UI/ConfirmationModal.tsx` | Yes — `ConfirmationModal.stories.tsx` | None | M | Repo version is Modal-composed w/ confirm-word/password flows; no danger-icon avatar pattern |
| CountBadge.tsx | none — net-new | No | None | L | No standalone count-pill exists anywhere in repo |
| DataTable.tsx | `UI/DataTable/DataTable.tsx` | No dedicated story (`Table.stories.tsx` covers sibling `Table.tsx`, not `DataTable`) | None | M | Repo version is tanstack-table + dnd-kit powered, no stretched-primary-action-button row pattern |
| DocPlaceholder.tsx | none — closest: `UI/FileIcon.tsx` / `Files/FilePreview.tsx` | Partial — `FileIcon.stories.tsx` (icon only, not the frame chrome) | None | L | No "sheet in a frame" placeholder concept exists |
| EntityIdentity.tsx | `Metadata/MetadataEntityHeader.tsx` | No | None | M | Same inline/stacked concept via TemplateLabel+Title, but unused/unwired; needs baseline-align pattern |
| EntityPill.tsx | `UI/TemplatePill.tsx` | Yes — `Components/UI/TemplatePill.stories.tsx` | None | S | Same dot+tint-pill shape; contrast handled via theme util instead of inline luminance calc |
| EntityTypeChip.tsx | none — closest: `UI/ColorDot.tsx` (no hover-expand overlay) | No | None | L | Hover-to-expand chip-over-row behavior has no repo equivalent |
| EntityTypeTag.tsx | `Metadata/Components/TemplateLabel.tsx` (filled-pill style) | Yes — `EntityViewer/TemplateLabel.stories.tsx` | None | M | Repo kept the filled pill the prototype explicitly replaced with a quiet dot+caps tag |
| FacetSection.tsx | `UI/FacetSection.tsx` | Yes — `Components/UI/CollapsibleSectionHeader.stories.tsx` | None | M | Repo version lacks search box, AND/OR mode, show-more/clear — reduced feature set |
| FadeTruncate.tsx | `UI/FadeTruncate.tsx` | Yes — `Components/UI/FadeTruncate.stories.tsx` | None | S | Near drop-in; repo adds `quoted` prop, uses line-clamp classes instead of measured px height |
| FiltersButton.tsx | `UI/FilterDrawerButton.tsx` | Yes — `Components/UI/FilterDrawerButton.stories.tsx` | None | S | Same active/count-badge pattern; repo version drops the `size`/`label` props |
| FiltersDrawer.tsx | `UI/FiltersDrawer.tsx` | Partial — via `Relationships.stories.tsx` wrapper, no direct story | None | S | Same header/close/footer shape; built on shared Drawer instead of custom RTL logic |
| ListCardRow.tsx | `UI/ListCardRow.tsx` | No | None | M | Repo row IS the interactive element (`role=button` on div); prototype's invisible-stretched-button a11y pattern is missing |
| ListInfoRow.tsx | `Routes/Entity/.../RelationshipsListInfoRow.tsx` | Yes — `EntityViewer/Relationships.stories.tsx` | None | M | Repo version is relationships-specific (expand/collapse-all) not a generic count+chips row |
| PageTag.tsx | `Routes/Entity/.../rows/PageTag.tsx` | Yes — `EntityViewer/Relationships.stories.tsx` | None | S | Near-identical button; reskin only |
| PdfPageThumb.tsx | none — closest: `UI/Files/FilePreview.tsx` (static icon, no real page raster) | Partial — `FileIcon.stories.tsx` (icon states only) | None | L | No pdf.js lazy-rasterized thumbnail/caching equivalent |
| ProgressBar.tsx | `UI/ProgressBar.tsx` | Yes — `ProgressBar.stories.tsx` | None | S | Same track/fill concept; repo uses `progress`/ARIA-role bar vs prototype's `value`+label |
| RadioGroup.tsx | `Forms/RadioSelect.tsx` | Yes — `Forms/RadioSelect.stories.tsx` | flowbite-react `Radio`, `Label` | M | Repo relies on flowbite Radio/Label, plain fieldset list (no card/border-selected row styling) |
| SegmentedControl.tsx | `UI/SegmentedControl/SegmentedControl.tsx` | Yes — `Components/UI/SegmentedControl.stories.tsx` | None | S | Same bordered-group/active-vellum concept, split into Root/Item subcomponents |
| Select.tsx | `UI/WarmSelect.tsx` | Yes — `Components/UI/WarmSelect.stories.tsx` | None | S | Near-verbatim structural/behavioral match (same state, click-outside, ESC, align logic) |
| SelectControls.tsx | none as reusable component — pattern inlined in `Files/FilesToolbar.tsx` | No | None | M | Select-all/deselect-all logic duplicated inline, not extracted; needs componentizing |
| StatsCard.tsx | none — net-new | No | None | L | No accent-label/value stat-tile component anywhere in repo |
| StatusBadge.tsx | `UI/StatusBadge.tsx` | Partial — `Components/UI/Feedback.stories.tsx`, `DesignSystem/StatusTintContrast.stories.tsx` | None | S | Same tint/text tone-map shape; repo uses generic tone enum vs prototype's ImportStatus enum |
| Stepper.tsx | `Routes/Settings/.../CreateDialog/Steppers.tsx` | No | None | M | Repo version is dot-only progress indicator; missing labels, connectors, checkmarks |
| UwaziLoader.tsx | `UI/UwaziLoader.tsx` | No | None | S | Byte-level equivalent (same grid/cell/sweep logic and color map) |
| ViewButton.tsx | none — closest: `UI/EmbededButton.tsx` / `UI/Button.tsx` | No | None | S | Generic icon+label button primitive exists; just needs an Eye+"View" instantiation |

## `relationships/` (29 components)

| Prototype component | Uwazi counterpart | Story coverage | Flowbite dependence | Difficulty | Note |
|---|---|---|---|---|---|
| ActiveFilterChips.tsx | `.../relationships/filters/RelationshipsActiveFilterChips.tsx` | Yes — `Relationships.stories.tsx` | None | S | Near-identical chip logic, already uses shared ActiveFilterChip |
| CreateRelationshipModal.tsx | `.../relationships/create-reference/CreateRelationshipModal.tsx` | Yes — `CreateRelationshipModal.stories.tsx` | None | M | Real flow has 5 steps (search/new/file/reltype/text) vs prototype's 3 |
| DirectionGlyph.tsx | `.../relationships/rows/DirectionGlyph.tsx` | Partial — rendered inside `Relationships.stories.tsx` rows, no dedicated story | None | S | Byte-for-byte same concept, heroicons vs lucide icon swap |
| DisplayMenu.tsx | none — net-new | N/A | None | L | Real toolbar keeps Group/Sort/Zoom/View always visible; no consolidated popover exists to reskin |
| DrawerActionBar.tsx | `Routes/Entity/Tabs/SideTabsFooters.tsx` + `footers/*TabFooter.tsx` | No | None | M | Same switch-by-tab footer idea, split across 7 footer components |
| EntityOverlay.tsx | `.../relationships/overlay/EntityOverlay.tsx` | Yes — `EntityOverlay.stories.tsx` | None | M | Same focus-trap/escape pattern; real overlay is read-only, prototype adds inline editing |
| FiltersRow.tsx | `.../relationships/panel/RelationshipsListInfoRow.tsx` | Yes — `Relationships.stories.tsx` (Panel) | None | M | Collapse/expand+count row matches; prototype's grouping-toggle half has no toolbar analog |
| GroupByControl.tsx | `.../relationships/controls/RelationshipsGroupByControl.tsx` | Yes — `Relationships.stories.tsx` | None | S | Same primary/secondary axis dropdown, real uses shared DropdownListbox |
| HighlightCard.tsx | folded into `.../relationships/rows/RelationshipRowVariants.tsx` (nested snippet) | Partial — nested row shown in `Relationships.stories.tsx` | None | M | Unused prototype catalog demo; not a standalone card in real repo |
| IxSuggestionsCard.tsx | `Settings/IX/IXSuggestions.tsx` (admin review page only) | No | None | L | Real IX review lives in Settings, not an inline entity-panel triage card |
| ManageRelationTypesModal.tsx | `Settings/RelationshipTypes/RelationshipTypes.tsx` + `components/Form.tsx` | No | None | L | Real is a full Settings table+sidepanel page, not an in-context modal |
| MetadataDrawerContent.tsx | `Routes/Entity/Tabs/tabsContent/MetadataTab.tsx` | Yes — `EntityViewer/Metadata.stories.tsx` | None | S | Same "delegate to shared metadata summary" pattern |
| ReferencePanel.tsx | `Routes/Entity/Tabs/SideTabsPanel.tsx` + `SideTabsContent/SideTabsFooters` | No — composed only inside Entity route | None | M | Same tab-drawer shell, split across many more files/context providers |
| RelatedDocCard.tsx | `.../relationships/rows/EntitySearchResult.tsx` | Partial — via `CreateRelationshipModal.stories.tsx` search step | None | M | Unused prototype catalog demo; closest analog is the create-modal search row |
| RelationshipGroupedCard.tsx | `.../relationships/rows/RelationshipGroupedCard.tsx` | Yes — `Relationships.stories.tsx` | None | S | Same expand/collapse shell; real uses CollapsibleSectionHeader + shared hook |
| RelationshipRow.tsx | `.../relationships/rows/RelationshipRow.tsx` + `RelationshipPanelRow`/`CollapsibleRelationshipRow` | Yes — `Relationships.stories.tsx` | None | S | Same variant-by-density dispatch; nested-evidence grouping covers the Hub concept |
| RelationshipsActionBar.tsx | `.../relationships/panel/RelationshipsActionBar.tsx` | Yes — `Relationships.stories.tsx` | None | S | Same sticky bottom bar: create/edit/select/delete |
| RelationshipsDrawerSection.tsx | `.../relationships/panel/RelationshipsPanel.tsx` | Yes — `Relationships.stories.tsx` (WithPanel) | None | S | Same toolbar+body+drawer composition shell |
| RelationshipsFilterDrawer.tsx | `.../relationships/filters/RelationshipsFiltersDrawer.tsx` + `RelationshipsFilterDrawerContent.tsx` | Partial — drawer chrome via `FilterDrawerButton.stories.tsx` | None | M | Real has only 2 facets (relType, entity type) vs prototype's 5 |
| RelationshipsGraphView.tsx | `.../relationships/views/RelationshipsGraphView.tsx` | Yes — `Relationships.stories.tsx` (graph view) | None | S | Real already ports the same radial SVG spoke/node/pan-zoom layout |
| RelationshipsPanelBody.tsx | `.../relationships/panel/RelationshipsPanelBody.tsx` | Yes — `Relationships.stories.tsx` | None | S | Same list/tree/graph view-switch dispatcher |
| RelationshipsTreeView.tsx | `.../relationships/views/RelationshipsTreeView.tsx` | Yes — `Relationships.stories.tsx` | None | S | Same grouped-tree-of-aggregates concept |
| SearchBar.tsx | `.../relationships/filters/RelationshipsSearchBar.tsx` | Yes — `QuerySearchBar.stories.tsx` + `Relationships.stories.tsx` | None | S | Real already extracted to shared QuerySearchBar with same tips/inline-chip slots |
| SortControl.tsx | `.../relationships/controls/RelationshipsSortControl.tsx` | Yes — `Relationships.stories.tsx` | None | S | Same dropdown, shared DropdownListbox |
| TemplateStructure.tsx | none — net-new | No | None | L | No entity-view schema/property editor with inherited badges exists; closest is Settings/Templates admin editor |
| ToCPanel.tsx | `Routes/Entity/Components/ToC/ToCPanel.tsx` + `ToCView`/`useToCPanel` | Yes — `EntityViewer/ToC.stories.tsx` | `ToCView.tsx` uses flowbite `Tooltip` | M | Same expand/collapse/jump-to-page tree; only relationships-adjacent file with flowbite dependence |
| TreeBranch.tsx | `.../relationships/views/RelationshipsTreeBranch.tsx` | Yes — via tree view in `Relationships.stories.tsx` | None | S | Same connector-line branch primitive; real adds first/middle/last/only line variants |
| ViewControls.tsx | `.../relationships/controls/RelationshipsViewControl.tsx` | Yes — `Relationships.stories.tsx` | None | S | Same list/tree/graph segmented control via shared SegmentedControl |
| ZoomControl.tsx | `.../relationships/controls/RelationshipsZoomControl.tsx` | Yes — `Relationships.stories.tsx` | None | S | Same 3-button density segmented control |

## `metadata/` (12 components)

| Prototype component | Uwazi counterpart | Story coverage | Flowbite dependence | Difficulty | Note |
|---|---|---|---|---|---|
| ConnectionGroupCard.tsx | none — net-new (no read-side multi-field merged connection table; only per-field `Relationship.tsx`) | No | None | L | Multi-hop merge/rowspan table has no read-side counterpart |
| DocumentCard.tsx | `Routes/Entity/Components/Files/FileDetailsView.tsx` (separate Files tab) | No | None | L | Lives in separate Files tab, not inline metadata card |
| EditInput.tsx | `EntityEditor/Components/TextField.tsx` (wraps Forms `InputField`) | Partial — via `EditEntity.stories.tsx` | None | M | Real repo uses RHF-registered InputField, not standalone controlled input |
| EntityMetadataSummary.tsx | `relationships/overlay/EntityOverlayMetadataSummary.tsx` | No dedicated story (only via Relationships/EntityOverlay stories) | None | L | Real one shows 4 fixed facts, not the full metadata record |
| InheritedValueChip.tsx | none — net-new (`RelationCaption.tsx` shows only a text suffix, no chip/glyph/rollup/trail) | No | None | L | Rollup chip & provenance trail concepts don't exist in real repo |
| MetadataCard.tsx | `Components/MetadataCard.tsx` | Yes — `Metadata.stories.tsx`, `EditEntity.stories.tsx` | None | S | Near-identical wrapper div/className shape |
| MetadataRecord.tsx | `MetadataDisplay.tsx` | Yes — `Metadata.stories.tsx` | None | M | Real one is a flat `dl` field list, not a ruled table + long-field cards split |
| RelationshipCards.tsx | `Components/RelationshipCards.tsx` | Yes — `Metadata.stories.tsx` | None | S | Same section-wrapper role; drops grouped-connection branch |
| RelationshipFieldCard.tsx | `Components/Relationship.tsx` | Yes — `Metadata.stories.tsx` | None | M | Real one renders link-only pills only; no inherited-value table/rollup |
| RelationshipFieldEditor.tsx | `EntityEditor/Components/RelationshipFieldEditor.tsx` | Yes — `EditEntity.stories.tsx` | None | S | Very close: same table layout, add/remove/edit-source actions |
| items.tsx (data/config, not a component) | none direct — closest is `buildTemplatePropertyById.ts` + `useFormatMetadata` hook | No | None | M | Prototype's item-shaping logic has no single equivalent; logic is scattered across hooks/formatters |
| `cardSpan.ts` (span-rhythm helper) | `metadataPropertyLayout.ts` | Yes (indirectly, via MetadataDisplay in `Metadata.stories.tsx`) | None | S | Same span-rhythm concept, different class taxonomy |

## `layout/` (15 components)

| Prototype component | Uwazi counterpart | Story coverage | Flowbite dependence | Difficulty | Note |
|---|---|---|---|---|---|
| AdaptiveSplitView.tsx | `Layouts/PaneLayout.tsx` (+ `PaneLayoutDesktop`/`PaneLayoutMobile`) | Yes — `Layouts/PaneLayout.stories.tsx` | None | M | Both swap layout by breakpoint, but real mobile mode is a swipeable pane carousel, not per-section bottom sheets |
| Beacon.tsx | `UI/Notifications/ThemedBeacon.tsx` + `BeaconShell`/`useBeaconDisplay` | Yes — `Beacon.stories.tsx` | None | **S** | Strong naming/structural convergence: real Beacon already does hover-expand pill, task % progress, severity-tinted mark, flash — near drop-in reskin |
| Breadcrumb.tsx | `Layouts/SettingsContent.tsx` (`SettingsHeader`'s flowbite `Breadcrumb`) | No dedicated story | flowbite-react `Breadcrumb` | M | Same segments-as-links concept, but real one is a flowbite component needing de-flowbite/reskin work |
| DocMeta.tsx | none — net-new | No | None | L | No rendition-format picker / entity-pill header strip exists anywhere in real repo's entity routes |
| DrawerTabs.tsx | `UI/Tabs/Tabs.tsx` (TabButtons) | Partial — `Tabs.stories.tsx` | None | M | Real Tabs is a full compound tab-panel system; prototype's lighter pill-with-count strip needs extraction/rebuild |
| MainTabs.tsx | `UI/Tabs/Tabs.tsx` (TabButtons) | Partial — `Tabs.stories.tsx` | None | M | Same tab-button base exists, but back-button + language-switch integration is prototype-specific |
| MobileActionMenu.tsx | `UI/Header/MoreMenu.tsx` + `BaseDropdown` | Partial — `Header.stories.tsx` | None | M | Real dropdown positioning (align only) lacks prototype's dynamic top/bottom flip logic |
| MobileBottomSheet.tsx | none — net-new (closest is `UI/Drawer.tsx`, a side panel not a bottom sheet) | Partial — `Drawer.stories.tsx` (different component) | None | L | No drag-to-snap bottom-sheet primitive exists; Drawer only slides in from the side |
| MobileNavDrawer.tsx | `UI/Header/MobileMenuDropdown.tsx` (BaseDropdown) | Partial — `Header.stories.tsx` | None | M | Both are the mobile nav-menu surface, but real one is an anchored dropdown, not a full slide-up sheet |
| Navbar.tsx | `UI/Header/Header.tsx` | Yes — `Header.stories.tsx` | None | M | Strong parity (RequestStatus≈Beacon slot, AskBertButton, language dropdown, theme toggle) but Tools/Collection dropdowns + mobile-sheet variant aren't in real Header |
| NotificationsDrawer.tsx | `UI/Notifications/NotificationsPanel.tsx` (built on `UI/Drawer.tsx`) | Yes — `NotificationsPanel.stories.tsx`, `NotificationItem.stories.tsx` | None | **S** | Naming/structural convergence with Beacon: real panel already buckets today/earlier, tracks tasks with progress bars; unread filter pill + retry action are the only real gaps |
| SegmentedTabs.tsx | `UI/SegmentedControl/SegmentedControl.tsx` | Yes — `Components/UI/SegmentedControl.stories.tsx` | None | S | Equivalent pill-group selector structure already exists |
| SplitView.tsx | `Layouts/PaneLayout/PaneLayoutDesktop.tsx` | Yes — `Layouts/PaneLayout.stories.tsx` | None | S | Same drag-resize concept; real version is more capable (localStorage-persisted ratios, N panes vs 2) |
| ToolsActionBar.tsx | `Routes/Entity/.../relationships/panel/RelationshipsActionBar.tsx` | No dedicated story | None | M | Same list/detail selection+bulk-delete pattern, but tightly coupled to relationships domain — needs generalizing |
| ToolsSidebar.tsx | `Routes/Settings/SettingsNavigation.tsx` | No dedicated story | None | S | Near-identical rail structure, even matching section grouping (Templates/Thesauri/Relationship types under a Metadata group) |

## Rollup

| | S (reskin) | M (rework) | L (net-new) | Total |
|---|---|---|---|---|
| `shared/` | 14 | 10 | 5 | 29 |
| `relationships/` | 16 | 9 | 4 | 29 |
| `metadata/` | 4 | 4 | 4 | 12 |
| `layout/` | 5 | 8 | 2 | 15 |
| **Total** | **39** | **31** | **15** | **85** |

Flowbite-react touches only **3 of the 85** counterparts directly: `RadioGroup` →
`Forms/RadioSelect.tsx`, `ToCPanel` → `ToCView.tsx`, `Breadcrumb` →
`SettingsContent.tsx`. All three are otherwise rated M, not L — de-flowbiting is
folded into work that's already needed, not an extra pass.

## Suggested migration order

1. **Tokens PR** (already staged, see `TOKENS-MAPPING.md`) — unblocks everything below.
2. **The convergent pairs first** (`Beacon`/`NotificationsDrawer`, most of
   `relationships/`) — these are S-rated *and* already story-covered, so they're
   the fastest way to prove the token layer against real, complex components
   before touching anything net-new.
3. **`shared/` primitives** next — small, mostly S/M, and everything else depends
   on them (`ActiveFilterChip`, `WarmSelect`/`Select`, `SegmentedControl`, `TemplatePill`).
4. **`metadata/`'s L-rated inheritance UI** last, and treat it as a product
   decision, not a style pass — the real repo's data model doesn't have
   multi-hop `inheritPath` at all, so shipping `ConnectionGroupCard`/
   `InheritedValueChip`/rollup chips means porting the resolver
   (`utils/inheritance.ts`) too, not just the component.
5. **Mobile chrome** (`MobileBottomSheet`, `DocMeta`, `TemplateStructure`,
   `DisplayMenu`) can slot in anytime — they're isolated L items with no
   downstream dependents.

## Reference

- Prototype sources: `app/src/components/{shared,relationships,metadata,layout}/`, `CLAUDE.md`.
- Real repo: `huridocs/uwazi`, branch `production`, component surface under
  `app/react/V2/Components/` and `app/react/V2/Routes/Entity/`; stories under
  `app/react/stories/`.
