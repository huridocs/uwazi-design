import { useEffect, useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { X, ArrowRight } from "lucide-react";
import { languageAtom } from "../../atoms/language";
import { referencesAtom } from "../../atoms/references";
import { librarySelectedEntityIdAtom } from "../../atoms/library";
import { openEntityAtom, focusEntityForPreviewAtom } from "../../atoms/focusedEntity";
import { getEntity, getEntityType } from "../../data/entities";
import { getEntityProfile } from "../../data/entityProfiles";
import { isCejilEntity, cejilReferencesFor } from "../../data/cejil/profile";
import type { MetadataField } from "../../data/metadata";
import { tabsForType } from "../../utils/entityTabs";
import { MainTabs } from "../layout/MainTabs";
import { DocumentViewer } from "../viewer/DocumentViewer";
import { RelationshipsDrawerSection } from "../relationships/RelationshipsDrawerSection";
import { DrawerFilesBody } from "../files/DrawerFilesBody";

/** The right-drawer entity preview. Selecting a library entity focuses it (see
 *  {@link focusEntityForPreviewAtom}) and renders the same main-tab navigation
 *  (Document / Metadata / Relationships / Files) as the full entity view, with
 *  the drawer-flavoured body for each tab. "View entity" navigates into the
 *  full-screen entity; Close returns the drawer to Filters. */
export function EntityDrawerPreview({ entityId }: { entityId: string }) {
  const language = useAtomValue(languageAtom);
  const references = useAtomValue(referencesAtom);
  const setSelected = useSetAtom(librarySelectedEntityIdAtom);
  const openEntity = useSetAtom(openEntityAtom);
  const focusForPreview = useSetAtom(focusEntityForPreviewAtom);

  const entity = getEntity(entityId);
  const type = entity ? getEntityType(entity.typeId) : undefined;
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

  return (
    <div className="flex flex-col h-full min-h-0 bg-paper">
      {/* Identity header on top — the entity title + close, acting as the
          panel header. Tabs sit beneath it (flipped from the entity view so the
          drawer reads title-first). */}
      <div
        className="flex items-center gap-2 h-10 px-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        <span
          className="w-2 h-2 rounded-[2px] shrink-0"
          style={{ backgroundColor: type?.color ?? "#6B7280" }}
        />
        <span className="text-xs font-semibold text-ink truncate flex-1">
          {entity?.title ?? "Unknown entity"}
        </span>
        <button
          onClick={() => setSelected(null)}
          aria-label="Back to filters"
          className="p-1.5 rounded-md hover:bg-warm text-ink-muted hover:text-ink transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main-tab navigation beneath the identity header. */}
      <MainTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

      {/* Tab content — drawer-flavoured bodies, scoped to the focused entity. */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {activeTab === "document" ? (
          <DocumentViewer showMinimap={false} hideActionBar />
        ) : activeTab === "relationships" ? (
          <RelationshipsDrawerSection hideActionBar />
        ) : activeTab === "files" ? (
          <DrawerFilesBody hideActionBar />
        ) : (
          <MetadataSummary language={language} entityId={entityId} />
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

/** Compact scalar-metadata body for the drawer's Metadata tab, read from the
 *  previewed entity's own profile (not the e3-hardcoded MetadataDrawerContent). */
function MetadataSummary({ language, entityId }: { language: string; entityId: string }) {
  const profile = getEntityProfile(entityId);
  const fields = (profile.metadata[language as keyof typeof profile.metadata] ?? []).filter(
    (f): f is MetadataField => f.type !== "relationship" && !!(f as MetadataField).value,
  );

  if (fields.length === 0) {
    return (
      <div className="h-full flex items-center justify-center px-6 text-center">
        <p className="text-xs text-ink-muted">No metadata for this entity yet.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid grid-cols-1 gap-3">
        {fields.map((f) => (
          <div key={f.id} className="rounded-lg p-3" style={{ backgroundColor: "var(--bg-warm)" }}>
            <span className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider block mb-1">
              {f.label}
            </span>
            <p className="text-sm text-ink leading-snug">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
