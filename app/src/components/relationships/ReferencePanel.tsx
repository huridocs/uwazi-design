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
import { activeFilterCountAtom } from "../../atoms/filters";
import { docSearchQueryAtom } from "../../atoms/references";

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
  // Dots, not counts: both are state the USER set that keeps acting on the
  // document while they read another tab. The relationship facets narrow what
  // the Relationships panel lists; the doc query keeps marking the page you're
  // looking at, from a box two tabs away — the case where "why is this
  // highlighted?" has no visible answer at all.
  const relFilterCount = useAtomValue(activeFilterCountAtom);
  const docQuery = useAtomValue(docSearchQueryAtom);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <EntityOverlay />

      <DrawerTabs
        tabs={baseDrawerTabs.map((tab) => {
          if (tab.id === "connections")
            return { ...tab, count: references.length, dot: relFilterCount > 0 };
          if (tab.id === "files") return { ...tab, count: files.length };
          if (tab.id === "search") return { ...tab, dot: docQuery.trim().length > 0 };
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
