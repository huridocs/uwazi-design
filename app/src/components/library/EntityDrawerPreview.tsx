import { useEffect, useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { X, ArrowRight } from "lucide-react";
import { referencesAtom } from "../../atoms/references";
import { librarySelectedEntityIdAtom, focusMetadataFieldAtom } from "../../atoms/library";
import { openEntityAtom, focusEntityForPreviewAtom } from "../../atoms/focusedEntity";
import { getEntity } from "../../data/entities";
import { EntityIdentity } from "../shared/EntityIdentity";
import { getEntityProfile } from "../../data/entityProfiles";
import { isCejilEntity, cejilReferencesFor } from "../../data/cejil/profile";
import { tabsForType } from "../../utils/entityTabs";
import { MainTabs } from "../layout/MainTabs";
import { DocumentViewer } from "../viewer/DocumentViewer";
import { RelationshipsDrawerSection } from "../relationships/RelationshipsDrawerSection";
import { DrawerFilesBody } from "../files/DrawerFilesBody";
import { EntityMetadataSummary } from "../metadata/EntityMetadataSummary";

/** The right-drawer entity preview. Selecting a library entity focuses it (see
 *  {@link focusEntityForPreviewAtom}) and renders the same main-tab navigation
 *  (Document / Metadata / Relationships / Files) as the full entity view, with
 *  the drawer-flavoured body for each tab. "View entity" navigates into the
 *  full-screen entity; Close returns the drawer to Filters. */
export function EntityDrawerPreview({ entityId }: { entityId: string }) {
  const references = useAtomValue(referencesAtom);
  const setSelected = useSetAtom(librarySelectedEntityIdAtom);
  const openEntity = useSetAtom(openEntityAtom);
  const focusForPreview = useSetAtom(focusEntityForPreviewAtom);

  const entity = getEntity(entityId);
  const profile = getEntityProfile(entityId);

  // Safety net: keep the focused entity in sync with the previewed one even if
  // selection changed without going through LibraryView's handler.
  useEffect(() => {
    focusForPreview(entityId);
  }, [entityId, focusForPreview]);

  // Library-wide connection count (matches the scoped Relationships body, since
  // both count refs touching this entity).
  const connectionCount = useMemo(
    () =>
      isCejilEntity(entityId)
        ? cejilReferencesFor(entityId).length
        : references.filter((r) => r.sourceEntityId === entityId || r.targetEntityId === entityId).length,
    [references, entityId],
  );
  const filesCount = profile.files?.length ?? 0;

  const tabs = tabsForType(profile.typeId, profile.hasDocument).map((tab) => {
    if (tab.id === "relationships") return { ...tab, count: connectionCount };
    if (tab.id === "files") return { ...tab, count: filesCount };
    return tab;
  });

  const [activeTab, setActiveTab] = useState(profile.hasDocument ? "document" : "metadata");
  useEffect(() => {
    setActiveTab(profile.hasDocument ? "document" : "metadata");
  }, [entityId, profile.hasDocument]);

  // A Results-tab Properties click deep-focuses a metadata field: force the
  // Metadata tab so `MetadataRecord` can scroll + flash it. Runs AFTER the
  // default-tab effect (both fire on entity change), so it wins; clearing the
  // atom later re-runs this with a falsy condition — a no-op, so it won't yank
  // the tab back.
  const focusField = useAtomValue(focusMetadataFieldAtom);
  useEffect(() => {
    if (focusField?.entityId === entityId) setActiveTab("metadata");
  }, [focusField, entityId]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-paper">
      {/* Identity header on top — the entity title + close, acting as the
          panel header. Tabs sit beneath it (flipped from the entity view so the
          drawer reads title-first). */}
      <div
        className="flex items-start gap-2 px-3 pt-3 pb-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        <EntityIdentity entity={entity} />
        <button
          onClick={() => setSelected(null)}
          aria-label="Back to filters"
          className="-mt-0.5 p-1.5 rounded-md hover:bg-warm text-ink-muted hover:text-ink transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main-tab navigation beneath the identity header. */}
      <MainTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

      {/* Tab content — drawer-flavoured bodies, scoped to the focused entity.
          flex COLUMN: the bodies are toolbar + flex-1 pane (the graph canvas, the
          scrolling list). As a plain block this box gave `flex-1` nothing to grow
          against, so the graph collapsed to the SVG's intrinsic height and sat in
          the top half of an empty pane. */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        {activeTab === "document" ? (
          <DocumentViewer showMinimap={false} hideActionBar />
        ) : activeTab === "relationships" ? (
          <RelationshipsDrawerSection hideActionBar />
        ) : activeTab === "files" ? (
          <DrawerFilesBody hideActionBar />
        ) : (
          <EntityMetadataSummary entityId={entityId} />
        )}
      </div>

      {/* Footer action bar — h-12, matching the entity view / library footers
          so the bottom divider is continuous across the split. */}
      <div
        className="shrink-0 flex items-center justify-end gap-2 h-12 px-3 bg-paper"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <button
          onClick={() => setSelected(null)}
          className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
        >
          Close
        </button>
        <button
          onClick={() => openEntity(entityId)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer"
          style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-surface)" }}
        >
          View entity <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
