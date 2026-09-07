import { RelationshipsPanelBody } from "./RelationshipsPanelBody";
import { RelationshipsActionBar } from "./RelationshipsActionBar";
import {
  RelationshipsToolbar,
  RelationshipsFiltersPanel,
  useReferenceDelete,
} from "./RelationshipsToolbar";

/** Drawer-style connections section: toolbar + body + scoped filters drawer.
 *  Used wherever the unified Relationships panel needs to render inside a
 *  drawer (ReferencePanel sub-tab, MetadataView's relationships tab, the entity
 *  preview panel's Relationships tab). `hideActionBar` drops the bottom
 *  RelationshipsActionBar for hosts that supply their own footer (the entity
 *  preview panel's Close / open-entity bar).
 *
 *  Everything it and the full-page `RelationshipsView` share — the toolbar row,
 *  the facet slide-over, the single-row delete — comes from
 *  `RelationshipsToolbar`. What stays different is the chrome around it: the
 *  main view brings its own split-view, a wider filters pane and a menu slot. */
export function RelationshipsDrawerSection({
  hideActionBar = false,
}: {
  hideActionBar?: boolean;
} = {}) {
  const { handleDelete, dialog: deleteDialog } = useReferenceDelete();

  return (
    <>
      <RelationshipsToolbar />
      <RelationshipsPanelBody onDelete={handleDelete} />
      {!hideActionBar && <RelationshipsActionBar compact />}
      <RelationshipsFiltersPanel />
      {deleteDialog}
    </>
  );
}
