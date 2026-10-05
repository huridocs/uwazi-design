import { useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { scopedReferencesAtom } from "../../atoms/references";
import { filesAtom } from "../../atoms/files";
import { DrawerTabs } from "../layout/DrawerTabs";
import { DrawerActionBar } from "./DrawerActionBar";
import { MetadataDrawerContent } from "./MetadataDrawerContent";
import { ToCPanel } from "./ToCPanel";
import { EntityPreviewSlideOver } from "./EntityPreviewSlideOver";
import { RelationshipsDrawerSection } from "./RelationshipsDrawerSection";
import { DrawerFilesBody } from "../files/DrawerFilesBody";
import { DocumentSearchBody } from "../search/DocumentSearchBody";
import { t } from "../../utils/i18n";
import { activeFilterCountAtom } from "../../atoms/filters";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { saveEntityEditAtom } from "../../atoms/entityChanges";
import { languageAtom } from "../../atoms/language";
import { MetadataEditBody } from "../../views/MetadataView";
import { activeDrawerTabAtom } from "../../atoms/entityDrawer";
import { docSearchQueryAtom } from "../../atoms/docSearch";

const baseDrawerTabs = [
  { id: "metadata", label: t("System", "Metadata") },
  { id: "toc", label: t("System", "ToC") },
  { id: "relationships", label: t("System", "Relationships") },
  { id: "files", label: t("System", "Files") },
  { id: "search", label: t("System", "Search") },
];

export function EntityDrawer() {
  const [references] = useAtom(scopedReferencesAtom);
  const files = useAtomValue(filesAtom);
  const [activeDrawerTab, setActiveDrawerTab] = useAtom(activeDrawerTabAtom);
  // Dots, not counts: both are state the USER set that keeps acting on the
  // document while they read another tab. The relationship facets narrow what
  // the Relationships panel lists; the doc query keeps marking the page you're
  // looking at, from a box two tabs away — the case where "why is this
  // highlighted?" has no visible answer at all.
  const relFilterCount = useAtomValue(activeFilterCountAtom);
  const docQuery = useAtomValue(docSearchQueryAtom);

  /* Edit opens the SAME MetadataEditBody the Metadata view renders, compact,
     beside the document — the pairing click-to-fill exists for: arm a field
     here, select the passage on the page, Fill. It edits the focused entity,
     which is the document's. */
  const [editing, setEditing] = useState(false);
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const language = useAtomValue(languageAtom);
  const saveEdit = useSetAtom(saveEntityEditAtom);
  // Only the Metadata tab has an editor; leaving it, or the entity, ends the session.
  useEffect(() => {
    if (activeDrawerTab !== "metadata") setEditing(false);
  }, [activeDrawerTab]);
  useEffect(() => setEditing(false), [focusedId]);

  return (
    // The gutter host (see `gutter-host`): the tabs and every tab body below sit
    // in this padding and carry none of their own.
    <div
      data-component="EntityDrawer"
      data-gutter-host
      className="gutter-host flex flex-col h-full relative overflow-clip"
    >
      <EntityPreviewSlideOver />

      <DrawerTabs
        tabs={baseDrawerTabs.map((tab) => {
          if (tab.id === "relationships")
            return { ...tab, count: references.length, dot: relFilterCount > 0 };
          if (tab.id === "files") return { ...tab, count: files.length };
          if (tab.id === "search") return { ...tab, dot: docQuery.trim().length > 0 };
          return tab;
        })}
        activeId={activeDrawerTab}
        onChange={setActiveDrawerTab}
      />

      {activeDrawerTab === "metadata" &&
        (editing ? (
          <MetadataEditBody
            key={focusedId}
            compact
            sessionId="metadata-edit-document"
            dirtyLabel="Metadata edits (document)"
            onCancel={() => setEditing(false)}
            onSave={(result) => {
              saveEdit({ id: focusedId, result, language });
              setEditing(false);
            }}
          />
        ) : (
          <MetadataDrawerContent />
        ))}
      {activeDrawerTab === "toc" && <ToCPanel />}
      {activeDrawerTab === "relationships" && <RelationshipsDrawerSection />}
      {activeDrawerTab === "files" && <DrawerFilesBody />}
      {activeDrawerTab === "search" && <DocumentSearchBody />}

      {!["metadata", "toc", "relationships", "files", "search"].includes(activeDrawerTab) && (
        <div data-part="empty" className="flex-1 flex items-center justify-center">
          <p className="text-sm text-ink-tertiary capitalize">
            {activeDrawerTab} content
          </p>
        </div>
      )}

      {/* Files + connections both carry their own footers (Files' "Add file"
          row, RelationshipsDrawerSection's bottom RelationshipsActionBar
          with Edit/Cancel/Save), so skip the shared bar for those tabs —
          otherwise a redundant 48px bar stacks underneath. The edit form
          carries its own Copy from / Cancel / Save bar, so it takes the slot. */}
      {activeDrawerTab !== "files" && activeDrawerTab !== "relationships" && !editing && (
        <DrawerActionBar activeTab={activeDrawerTab} onEdit={() => setEditing(true)} />
      )}
    </div>
  );
}
