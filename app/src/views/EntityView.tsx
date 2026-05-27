import { useState, type ReactNode } from "react";
import { useAtom } from "jotai";
import { referencesAtom } from "../atoms/references";
import { filesAtom } from "../atoms/files";
import { languageAtom, type Language } from "../atoms/language";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { MainTabs } from "../components/layout/MainTabs";
import { DocMeta } from "../components/layout/DocMeta";
import { DocumentViewer } from "../components/viewer/DocumentViewer";
import { ReferencePanel } from "../components/relationships/ReferencePanel";
import { MetadataDrawerContent } from "../components/relationships/MetadataDrawerContent";
import { ToCPanel } from "../components/relationships/ToCPanel";
import { CreateRelationshipModal } from "../components/relationships/CreateRelationshipModal";
import { ManageRelationTypesModal } from "../components/relationships/ManageRelationTypesModal";
import { ToastContainer } from "./ToastContainer";
import { FilesView } from "./FilesView";
import { MetadataView } from "./MetadataView";
import { RelationshipsView } from "./RelationshipsView";
import { t } from "../utils/i18n";

const mainTabs = [
  { id: "document", label: t("System", "Document") },
  { id: "metadata", label: t("System", "Metadata") },
  { id: "relationships", label: t("System", "Relationships"), count: 0 },
  { id: "files", label: t("System", "Files"), count: 0 },
];

export function EntityView() {
  const [activeTab, setActiveTab] = useState("document");
  const [references] = useAtom(referencesAtom);
  const [files] = useAtom(filesAtom);
  const [language, setLanguage] = useAtom(languageAtom);

  const tabs = mainTabs.map((tab) => {
    if (tab.id === "relationships") return { ...tab, count: references.length };
    if (tab.id === "files") return { ...tab, count: files.length };
    return tab;
  });

  if (activeTab === "metadata") {
    return (
      <>
        <MetadataView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <CreateRelationshipModal />
        <ManageRelationTypesModal />
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
        <CreateRelationshipModal />
        <ManageRelationTypesModal />
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
      <DocumentViewer actionBarMenu={menuTrigger} />
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
            label: t("System", "Relationships"),
            count: references.length,
            content: <ReferencePanel />,
          },
          {
            id: "metadata",
            label: t("System", "Metadata"),
            content: <MetadataDrawerContent />,
          },
          {
            id: "toc",
            label: t("System", "Table of contents"),
            content: <ToCPanel />,
          },
        ]}
      />
      <CreateRelationshipModal />
      <ManageRelationTypesModal />
      <ToastContainer />
    </>
  );
}
