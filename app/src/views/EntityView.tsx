import { useEffect, useState, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { scopedReferencesAtom } from "../atoms/references";
import { filesAtom } from "../atoms/files";
import { languageAtom, type Language } from "../atoms/language";
import { focusedEntityIdAtom, goBackAtom } from "../atoms/focusedEntity";
import { getEntityProfile } from "../data/entityProfiles";
import { tabsForType } from "../utils/entityTabs";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { MainTabs } from "../components/layout/MainTabs";
import { DocMeta } from "../components/layout/DocMeta";
import { DocumentViewer } from "../components/viewer/DocumentViewer";
import { ReferencePanel } from "../components/relationships/ReferencePanel";
import { MetadataDrawerContent } from "../components/relationships/MetadataDrawerContent";
import { ToCPanel } from "../components/relationships/ToCPanel";
import { CreateRelationshipModal } from "../components/relationships/CreateRelationshipModal";
import { ManageRelationTypesModal } from "../components/relationships/ManageRelationTypesModal";
import { FilesView } from "./FilesView";
import { MetadataView } from "./MetadataView";
import { RelationshipsView } from "./RelationshipsView";
import { t } from "../utils/i18n";

export function EntityView() {
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const profile = getEntityProfile(focusedId);

  // Both atoms are already focal-scoped: scopedReferencesAtom returns this
  // entity's slice of the corpus, and filesAtom is re-seeded to its files on
  // focus change. So the tab counts are just their lengths.
  const [references] = useAtom(scopedReferencesAtom);
  const [files] = useAtom(filesAtom);
  const [language, setLanguage] = useAtom(languageAtom);
  const goBack = useSetAtom(goBackAtom);

  const [activeTab, setActiveTab] = useState(profile.hasDocument ? "document" : "metadata");

  // Reset to the type's default tab whenever the focal entity changes.
  useEffect(() => {
    setActiveTab(profile.hasDocument ? "document" : "metadata");
  }, [focusedId, profile.hasDocument]);

  const relCount = references.length;
  const filesCount = files.length;

  const tabs = tabsForType(profile.typeId, profile.hasDocument).map((tab) => {
    if (tab.id === "relationships") return { ...tab, count: relCount };
    if (tab.id === "files") return { ...tab, count: filesCount };
    return tab;
  });

  if (activeTab === "metadata") {
    return (
      <>
        <MetadataView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} onBack={goBack} />
        <CreateRelationshipModal />
        <ManageRelationTypesModal />
      </>
    );
  }

  if (activeTab === "files") {
    return <FilesView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} onBack={goBack} />;
  }

  if (activeTab === "relationships") {
    return (
      <>
        <RelationshipsView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} onBack={goBack} />
        <CreateRelationshipModal />
        <ManageRelationTypesModal />
      </>
    );
  }

  const renderLeft = (menuTrigger?: ReactNode) => (
    <div className="flex flex-col h-full min-h-0 bg-paper">
      <MainTabs
        tabs={tabs}
        activeId={activeTab}
        onChange={setActiveTab}
        onBack={goBack}
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
            count: relCount,
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
    </>
  );
}
