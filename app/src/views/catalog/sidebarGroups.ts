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
      { id: "el-hint", label: "Hint" },
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
      { id: "ev-thesaurus-picker", label: "ThesaurusPicker · add value" },
      { id: "ev-bulk-field-row", label: "BulkFieldRow · bulk edit" },
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
      { id: "csv-sidebar", label: "SettingsNav rail" },
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
      { id: "fl-filters-drawer", label: "FiltersSlideOver" },
      { id: "fl-facet-section", label: "FacetSection" },
      { id: "fl-active-filter-chip", label: "ActiveFilterChip" },
      { id: "fl-toggle-chip", label: "ToggleChip" },
      { id: "fl-collapse-controls", label: "CollapseControls" },
      { id: "fl-list-info-row", label: "ListInfoRow" },
      { id: "fl-list-card-row", label: "ListCardRow" },
      { id: "fl-checkbox", label: "Checkbox" },
      { id: "fl-zoom-control", label: "ZoomControl" },
      { id: "fl-fade-truncate", label: "FadeTruncate" },
      { id: "fl-select-controls", label: "SelectControls" },
      { id: "fl-selection-actions-menu", label: "SelectionActionsMenu" },
      { id: "fl-change-template", label: "ChangeTemplateDialog" },
      { id: "fl-share-bulk", label: "ShareEntityModal · selection" },
    ],
  },
  {
    label: "Entity View — Relationships",
    items: [
      { id: "relationship-row-aggregate", label: "RelationshipRow · aggregate" },
      { id: "relationship-row-hub", label: "RelationshipRow · hub" },
      { id: "relationship-grouped-card-aggregate", label: "RelationshipGroupedCard · aggregate" },
      { id: "view-controls", label: "ViewControls" },
      { id: "year-strip", label: "YearStrip" },
      { id: "event-row", label: "EventRow" },
      { id: "direction-glyph", label: "DirectionGlyph" },
      { id: "row-checkbox", label: "RowCheckbox" },
      { id: "relationships-action-bar", label: "RelationshipsActionBar" },
      { id: "manage-relation-types-modal", label: "ManageRelationTypesModal" },
    ],
  },
  {
    label: "Shared",
    items: [
      { id: "sh-section-label", label: "SectionLabel" },
      { id: "sh-pin-toggle", label: "PinToggle" },
      { id: "sh-saved-views", label: "SavedViewsMenu" },
      { id: "sh-case-panel", label: "CasePanel" },
      { id: "sh-filter-card", label: "FilterCard" },
      { id: "sh-match-mode-toggle", label: "MatchModeToggle" },
      { id: "sh-highlighted-text", label: "HighlightedText" },
      { id: "sh-field-message", label: "FieldMessage" },
      { id: "sh-confirm-dialog", label: "ConfirmDialog" },
      { id: "sh-confirm-delete", label: "ConfirmDelete" },
      { id: "sh-typed-confirm", label: "TypedConfirmModal" },
      { id: "sh-password-confirm", label: "PasswordConfirmModal" },
      { id: "sh-toast", label: "Toast" },
      { id: "sh-uwazi-loader", label: "UwaziLoader" },
      { id: "sh-thesaurus-value-label", label: "ThesaurusValueLabel" },
    ],
  },
  {
    label: "Settings",
    items: [
      { id: "set-data-table", label: "DataTable" },
      { id: "set-radio-group", label: "RadioGroup" },
      { id: "set-button", label: "SettingsButton" },
      { id: "set-field", label: "SettingsField" },
      { id: "set-status-pill", label: "StatusPill" },
      { id: "set-row-actions", label: "RowActions" },
      { id: "set-list-page", label: "SettingsListPage" },
      { id: "set-empty-state", label: "SettingsEmptyState" },
      { id: "set-section", label: "SettingsSection" },
      { id: "set-editor", label: "SettingsEditor" },
      { id: "set-stats-card", label: "StatsCard" },
      { id: "set-date-input", label: "DateInput" },
      { id: "set-map-point", label: "MapPointPicker" },
      { id: "set-image-picker", label: "ImagePickerModal" },
    ],
  },
  {
    label: "Screens",
    items: [{ id: "sc-login", label: "Log in" }],
  },
  // Dev builds only, like the section it indexes.
  ...(import.meta.env.DEV ? [{ label: "Dev", items: [{ id: "dev-panel", label: "Dev panel" }] }] : []),
];

export const allItemIds = sidebarGroups.flatMap((g) =>
  g.items.map((i) => i.id),
);
