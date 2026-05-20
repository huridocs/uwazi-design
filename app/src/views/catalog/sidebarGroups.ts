export interface SidebarGroup {
  label: string;
  items: { id: string; label: string }[];
}

/** Catalog sidebar index — order here is the order shown in the nav. Each
 *  `id` matches a `<div id="...">` anchor in the catalog body so clicking
 *  the sidebar item scrolls to it.
 *
 *  Grouping logic: foundations (Style Guide, Elements) first, then layout
 *  scaffolding (Layout, Filters & Lists), then surfaces (Document Viewer,
 *  Relationships, Metadata, Files, Drawer, Import CSV), then primitives
 *  (Shared). The old "Entity View — References" group has been folded into
 *  Relationships since the references and relationships surfaces merged. */
export const sidebarGroups: SidebarGroup[] = [
  {
    label: "Foundations",
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
      { id: "direction-glyph", label: "DirectionGlyph" },
      { id: "el-buttons", label: "Buttons" },
    ],
  },
  {
    label: "Layout",
    items: [
      { id: "ev-main-tabs", label: "MainTabs" },
      { id: "ev-segmented-tabs", label: "SegmentedTabs" },
      { id: "ev-drawer-tabs", label: "DrawerTabs" },
      { id: "ev-drawer-action-bar", label: "DrawerActionBar" },
    ],
  },
  {
    label: "Filters & Lists",
    items: [
      { id: "ev-search-bar", label: "SearchBar" },
      { id: "fl-filters-button", label: "FiltersButton" },
      { id: "fl-filters-drawer", label: "FiltersDrawer" },
      { id: "fl-facet-section", label: "FacetSection" },
      { id: "fl-active-filter-chip", label: "ActiveFilterChip" },
      { id: "fl-view-mode-controls", label: "ViewModeControls" },
      { id: "fl-collapse-controls", label: "CollapseControls" },
      { id: "ev-filters-row", label: "FiltersRow" },
      { id: "fl-list-info-row", label: "ListInfoRow" },
      { id: "fl-list-card-row", label: "ListCardRow" },
      { id: "fl-checkbox", label: "Checkbox" },
      { id: "fl-select-controls", label: "SelectControls" },
      { id: "fl-zoom-control", label: "ZoomControl" },
      { id: "fl-fade-truncate", label: "FadeTruncate" },
    ],
  },
  {
    label: "Document Viewer",
    items: [
      { id: "ev-action-bar", label: "ActionBar" },
      { id: "ev-floating-menu", label: "FloatingMenu" },
      { id: "ev-hover-expand", label: "HoverExpand" },
      { id: "ev-ref-minimap", label: "RefMinimap" },
      { id: "ev-highlight-card", label: "HighlightCard" },
      { id: "ev-related-doc", label: "RelatedDocCard" },
    ],
  },
  {
    label: "Relationships",
    items: [
      { id: "ev-relationship-row-ref", label: "RelationshipRow · reference" },
      { id: "relationship-row-aggregate", label: "RelationshipRow · aggregate" },
      { id: "relationship-row-hub", label: "RelationshipRow · hub" },
      { id: "ev-relationship-grouped-card", label: "RelationshipGroupedCard · reference" },
      { id: "relationship-grouped-card-aggregate", label: "RelationshipGroupedCard · aggregate" },
      { id: "row-checkbox", label: "RowCheckbox" },
      { id: "view-controls", label: "ViewControls" },
      { id: "group-by-control", label: "GroupByControl" },
      { id: "sort-control", label: "SortControl" },
      { id: "relationships-action-bar", label: "RelationshipsActionBar" },
      { id: "manage-relation-types-modal", label: "ManageRelationTypesModal" },
    ],
  },
  {
    label: "Metadata",
    items: [{ id: "ev-metadata-card", label: "MetadataCard" }],
  },
  {
    label: "Files",
    items: [{ id: "ev-file-table", label: "FileTable" }],
  },
  {
    label: "Import CSV",
    items: [
      { id: "csv-sidebar", label: "ToolsSidebar" },
      { id: "csv-breadcrumb", label: "Breadcrumb" },
      { id: "csv-status-badge", label: "StatusBadge" },
      { id: "csv-progress-bar", label: "ProgressBar" },
      { id: "csv-stats-card", label: "StatsCard" },
      { id: "csv-stepper", label: "Stepper" },
      { id: "csv-alert-banner", label: "AlertBanner" },
    ],
  },
  {
    label: "Shared",
    items: [
      { id: "sh-confirm-dialog", label: "ConfirmDialog" },
      { id: "sh-toast", label: "Toast" },
      { id: "sh-uwazi-loader", label: "UwaziLoader" },
    ],
  },
];

export const allItemIds = sidebarGroups.flatMap((g) =>
  g.items.map((i) => i.id),
);
