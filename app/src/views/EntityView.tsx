import { useState, type ReactNode } from "react";
import { useAtom } from "jotai";
import { referencesAtom } from "../atoms/references";
import { languageAtom, type Language } from "../atoms/language";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { MainTabs } from "../components/layout/MainTabs";
import { DocMeta } from "../components/layout/DocMeta";
import { DocumentViewer } from "../components/viewer/DocumentViewer";
import { ReferencePanel } from "../components/relationships/ReferencePanel";
import { MetadataDrawerContent } from "../components/relationships/MetadataDrawerContent";
import { ToCPanel } from "../components/relationships/ToCPanel";
import { EntityPickerModal } from "./EntityPickerModal";
import { ToastContainer } from "./ToastContainer";
import { FilesView } from "./FilesView";
import { MetadataView } from "./MetadataView";
import { RelationshipsView } from "./RelationshipsView";

const mainTabs = [
  { id: "metadata", label: "Metadata" },
  { id: "document", label: "Document" },
  { id: "relationships", label: "Relationships", count: 0 },
  { id: "files", label: "Files", count: 6 },
];

export function EntityView() {
  const [activeTab, setActiveTab] = useState("document");
  const [references] = useAtom(referencesAtom);
  const [language, setLanguage] = useAtom(languageAtom);

  const tabs = mainTabs.map((t) =>
    t.id === "relationships" ? { ...t, count: references.length } : t,
  );

  if (activeTab === "metadata") {
    return (
      <>
        <MetadataView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <ToastContainer />
      </>
    );
  }

  if (activeTab === "files") {
    return (
      <>
        <FilesView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <ToastContainer />
      </>
    );
  }

  if (activeTab === "relationships") {
    return (
      <>
        <RelationshipsView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <EntityPickerModal />
        <ToastContainer />
      </>
    );
  }

  const renderLeft = (menuTrigger?: ReactNode) => (
    <div className="flex flex-col h-full min-h-0 bg-paper">
      <MainTabs
        tabs={tabs}
        activeId={activeTab}
        onChange={setActiveTab}
        languages={["EN", "ES", "FR", "AR"]}
        availableLanguages={["EN", "ES", "FR", "AR"]}
        activeLanguage={language}
        onLanguageChange={(lang) => setLanguage(lang as Language)}
      />
      <DocMeta />
      <DocumentViewer actionBarLeft={menuTrigger} />
    </div>
  );

  return (
    <>
      <AdaptiveSplitView
        left={renderLeft()}
        mobileLeft={(menuTrigger) => renderLeft(menuTrigger)}
        right={<ReferencePanel />}
        defaultRightWidth={560}
        minRightWidth={460}
        maxRightWidth={720}
        mobileSections={[
          {
            id: "connections",
            label: "Relationships",
            count: references.length,
            content: <ReferencePanel />,
          },
          {
            id: "metadata",
            label: "Metadata",
            content: <MetadataDrawerContent />,
          },
          {
            id: "toc",
            label: "Table of contents",
            content: <ToCPanel />,
          },
        ]}
      />
      <EntityPickerModal />
      <ToastContainer />
    </>
  );
}
