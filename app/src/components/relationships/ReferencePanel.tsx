import { useAtom } from "jotai";
import { referencesAtom, activeDrawerTabAtom } from "../../atoms/references";
import { DrawerTabs } from "../layout/DrawerTabs";
import { DrawerActionBar } from "./DrawerActionBar";
import { MetadataDrawerContent } from "./MetadataDrawerContent";
import { ToCPanel } from "./ToCPanel";
import { EntityOverlay } from "./EntityOverlay";
import { RelationshipsDrawerSection } from "./RelationshipsDrawerSection";
import { t } from "../../utils/i18n";

const baseDrawerTabs = [
  { id: "metadata", label: t("System", "Metadata") },
  { id: "toc", label: t("System", "ToC") },
  { id: "connections", label: t("System", "Relationships") },
  { id: "search", label: t("System", "Search") },
];

export function ReferencePanel() {
  const [references] = useAtom(referencesAtom);
  const [activeDrawerTab, setActiveDrawerTab] = useAtom(activeDrawerTabAtom);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <EntityOverlay />

      <DrawerTabs
        tabs={baseDrawerTabs.map((tab) =>
          tab.id === "connections" ? { ...tab, count: references.length } : tab,
        )}
        activeId={activeDrawerTab}
        onChange={setActiveDrawerTab}
      />

      {activeDrawerTab === "metadata" && <MetadataDrawerContent />}
      {activeDrawerTab === "toc" && <ToCPanel />}
      {activeDrawerTab === "connections" && <RelationshipsDrawerSection />}

      {!["metadata", "toc", "connections"].includes(activeDrawerTab) && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-ink-muted capitalize">
            {activeDrawerTab} content
          </p>
        </div>
      )}

      <DrawerActionBar activeTab={activeDrawerTab} />
    </div>
  );
}
