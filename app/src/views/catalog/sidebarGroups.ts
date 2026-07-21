import { handoffDocs } from "./handoffDocs";

export interface SidebarGroup {
  label: string;
  items: { id: string; label: string }[];
}

/** Catalog sidebar index. Order here MUST match the order of `<div id="…">`
 *  anchors in the catalog body (`ComponentCatalog.tsx`) — otherwise the
 *  active-section highlight jumps non-sequentially as the user scrolls. */
export const sidebarGroups: SidebarGroup[] = [
  {
    // Derived from the files in `handoff/` — see `handoffDocs.ts`.
    label: "Handoff",
    items: handoffDocs.map((doc) => ({ id: doc.id, label: doc.label })),
  },
  {
    label: "Style Guide",
    items: [
      { id: "sg-colors", label: "Colors" },
      { id: "sg-typography", label: "Typography" },
      { id: "sg-shadows", label: "Shadows" },
      { id: "sg-radii", label: "Border Radius" },
      { id: "sg-spacing", label: "Spacing" },
    ],
  },
  {
    label: "Elements",
    items: [
      { id: "el-entity-pill", label: "EntityPill" },
      { id: "el-page-tag", label: "PageTag" },
      { id: "el-count-badge", label: "CountBadge" },
      { id: "el-buttons", label: "Buttons" },
    ],
  },
  {
    label: "Entity View — Layout",
    items: [
      { id: "ev-main-tabs", label: "MainTabs" },
      { id: "ev-segmented-tabs", label: "SegmentedTabs" },
      { id: "ev-drawer-tabs", label: "DrawerTabs" },
      { id: "ev-beacon", label: "Beacon" },
    ],
  },
  {
    label: "Entity View — Document",
    items: [
      { id: "ev-floating-menu", label: "FloatingMenu" },
      { id: "ev-action-bar", label: "ActionBar" },
      { id: "ev-hover-expand", label: "HoverExpand" },
      { id: "ev-ref-minimap", label: "RefMinimap" },
    ],
  },
  {
    label: "Entity View — References",
    items: [
      { id: "ev-search-bar", label: "SearchBar" },
      { id: "ev-filters-row", label: "FiltersRow" },
      { id: "ev-relationship-row-ref", label: "RelationshipRow · reference" },
      { id: "ev-relationship-grouped-card", label: "RelationshipGroupedCard" },
      { id: "ev-highlight-card", label: "HighlightCard" },
      { id: "ev-related-doc", label: "RelatedDocCard" },
    ],
  },
  {
    label: "Entity View — Metadata",
    items: [
      { id: "ev-metadata-card", label: "MetadataCard" },
      { id: "ev-connection-group-card", label: "ConnectionGroupCard · multi-inherit" },
      { id: "ev-relationship-field-card", label: "RelationshipFieldCard · single + link" },
      { id: "ev-inherited-value-chip", label: "InheritedValueChip" },
      { id: "ev-relationship-field-editor", label: "RelationshipFieldEditor" },
    ],
  },
  {
    label: "Entity View — Files",
    items: [{ id: "ev-file-table", label: "FileTable" }],
  },
  {
    label: "Entity View — Drawer",
    items: [{ id: "ev-drawer-action-bar", label: "DrawerActionBar" }],
  },
  {
    label: "Import CSV — Layout",
    items: [
      { id: "csv-sidebar", label: "ToolsSidebar" },
      { id: "csv-breadcrumb", label: "Breadcrumb" },
    ],
  },
  {
    label: "Import CSV — Components",
    items: [
      { id: "csv-status-badge", label: "StatusBadge" },
      { id: "csv-progress-bar", label: "ProgressBar" },
      { id: "csv-stats-card", label: "StatsCard" },
      { id: "csv-stepper", label: "Stepper" },
      { id: "csv-alert-banner", label: "AlertBanner" },
    ],
  },
  {
    label: "Filters & Lists",
    items: [
      { id: "fl-filters-button", label: "FiltersButton" },
      { id: "fl-filters-drawer", label: "FiltersDrawer" },
      { id: "fl-facet-section", label: "FacetSection" },
      { id: "fl-active-filter-chip", label: "ActiveFilterChip" },
      { id: "fl-view-mode-controls", label: "ViewModeControls" },
      { id: "fl-collapse-controls", label: "CollapseControls" },
      { id: "fl-list-info-row", label: "ListInfoRow" },
      { id: "fl-list-card-row", label: "ListCardRow" },
      { id: "fl-checkbox", label: "Checkbox" },
      { id: "fl-zoom-control", label: "ZoomControl" },
      { id: "fl-fade-truncate", label: "FadeTruncate" },
      { id: "fl-select-controls", label: "SelectControls" },
    ],
  },
  {
    label: "Entity View — Relationships",
    items: [
      { id: "relationship-row-aggregate", label: "RelationshipRow · aggregate" },
      { id: "relationship-row-hub", label: "RelationshipRow · hub" },
      { id: "relationship-grouped-card-aggregate", label: "RelationshipGroupedCard · aggregate" },
      { id: "view-controls", label: "ViewControls" },
      { id: "group-by-control", label: "GroupByControl" },
      { id: "sort-control", label: "SortControl" },
      { id: "direction-glyph", label: "DirectionGlyph" },
      { id: "row-checkbox", label: "RowCheckbox" },
      { id: "relationships-action-bar", label: "RelationshipsActionBar" },
      { id: "manage-relation-types-modal", label: "ManageRelationTypesModal" },
    ],
  },
  {
    label: "Shared",
    items: [
      { id: "sh-highlighted-text", label: "HighlightedText" },
      { id: "sh-confirm-dialog", label: "ConfirmDialog" },
      { id: "sh-toast", label: "Toast" },
      { id: "sh-uwazi-loader", label: "UwaziLoader" },
    ],
  },
  {
    label: "Settings",
    items: [
      { id: "set-data-table", label: "DataTable" },
      { id: "set-radio-group", label: "RadioGroup" },
      { id: "set-button", label: "Button" },
      { id: "set-field", label: "Field" },
      { id: "set-status-pill", label: "StatusPill" },
      { id: "set-row-actions", label: "RowActions" },
    ],
  },
];

export const allItemIds = sidebarGroups.flatMap((g) =>
  g.items.map((i) => i.id),
);
