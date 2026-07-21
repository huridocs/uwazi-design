import { useAtom, useAtomValue } from "jotai";
import { scopedReferencesAtom, activeDrawerTabAtom } from "../../atoms/references";
import { filesAtom } from "../../atoms/files";
import { DrawerTabs } from "../layout/DrawerTabs";
import { DrawerActionBar } from "./DrawerActionBar";
import { MetadataDrawerContent } from "./MetadataDrawerContent";
import { ToCPanel } from "./ToCPanel";
import { EntityOverlay } from "./EntityOverlay";
import { RelationshipsDrawerSection } from "./RelationshipsDrawerSection";
import { DrawerFilesBody } from "../files/DrawerFilesBody";
import { DocumentSearchBody } from "../search/DocumentSearchBody";
import { t } from "../../utils/i18n";

const baseDrawerTabs = [
  { id: "metadata", label: t("System", "Metadata") },
  { id: "toc", label: t("System", "ToC") },
  { id: "connections", label: t("System", "Relationships") },
  { id: "files", label: t("System", "Files") },
  { id: "search", label: t("System", "Search") },
];

export function ReferencePanel() {
  const [references] = useAtom(scopedReferencesAtom);
  const files = useAtomValue(filesAtom);
  const [activeDrawerTab, setActiveDrawerTab] = useAtom(activeDrawerTabAtom);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <EntityOverlay />

      <DrawerTabs
        tabs={baseDrawerTabs.map((tab) => {
          if (tab.id === "connections") return { ...tab, count: references.length };
          if (tab.id === "files") return { ...tab, count: files.length };
          return tab;
        })}
        activeId={activeDrawerTab}
        onChange={setActiveDrawerTab}
      />

      {activeDrawerTab === "metadata" && <MetadataDrawerContent />}
      {activeDrawerTab === "toc" && <ToCPanel />}
      {activeDrawerTab === "connections" && <RelationshipsDrawerSection />}
      {activeDrawerTab === "files" && <DrawerFilesBody />}
      {activeDrawerTab === "search" && <DocumentSearchBody />}

      {!["metadata", "toc", "connections", "files", "search"].includes(activeDrawerTab) && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-ink-muted capitalize">
            {activeDrawerTab} content
          </p>
        </div>
      )}

      {/* Files + connections both carry their own footers (Files' "Add file"
          row, RelationshipsDrawerSection's bottom RelationshipsActionBar
          with Edit/Cancel/Save), so skip the shared bar for those tabs —
          otherwise a redundant 48px bar stacks underneath. */}
      {activeDrawerTab !== "files" && activeDrawerTab !== "connections" && (
        <DrawerActionBar activeTab={activeDrawerTab} />
      )}
    </div>
  );
}
