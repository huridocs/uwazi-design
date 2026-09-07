import { type ReactNode } from "react";
import { useAtom } from "jotai";
import { languageAtom, type Language } from "../atoms/language";
import { focusedEntityIdAtom } from "../atoms/focusedEntity";
import { getEntityProfile } from "../data/entityProfiles";
import { MOCK_DOCUMENT_FILE } from "../data/files";
import { viewAtom } from "../atoms/filters";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { DrawerTabs } from "../components/layout/DrawerTabs";
import { MainTabs } from "../components/layout/MainTabs";
import { DocMeta } from "../components/layout/DocMeta";
import { DocumentViewer } from "../components/viewer/DocumentViewer";
import {
  RelationshipsToolbar,
  RelationshipsFiltersPanel,
  useReferenceDelete,
} from "../components/relationships/RelationshipsToolbar";
import { EntityOverlay } from "../components/relationships/EntityOverlay";
import { RelationshipsPanelBody } from "../components/relationships/RelationshipsPanelBody";
import { RelationshipsActionBar } from "../components/relationships/RelationshipsActionBar";

interface Props {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onBack?: () => void;
}

/** Single main-tab surface that absorbs the old References and Relationships
 *  tabs. The panel-mode toggle inside picks the projection (list / grouped /
 *  tree / graph) over the same underlying references[]. */
export function RelationshipsView({ tabs, activeTab, onTabChange, onBack }: Props) {
  const [focusedId] = useAtom(focusedEntityIdAtom);
  const profile = getEntityProfile(focusedId);
  const [language, setLanguage] = useAtom(languageAtom);
  const [view] = useAtom(viewAtom);
  const { handleDelete, dialog: deleteDialog } = useReferenceDelete();

  const hideMinimap = view === "graph";

  const renderLeft = (menuTrigger?: ReactNode) => (
        <div className="flex flex-col h-full min-h-0 bg-paper relative overflow-hidden">
          <MainTabs
            tabs={tabs}
            activeId={activeTab}
            onChange={onTabChange}
            onBack={onBack}
            languages={["EN", "ES", "FR", "AR"]}
            availableLanguages={["EN", "ES", "FR", "AR"]}
            activeLanguage={language}
            onLanguageChange={(lang) => setLanguage(lang as Language)}
          />
          <DocMeta showPdfSelector={false} />

          <div className="pt-2" />
          <RelationshipsToolbar />

          <RelationshipsPanelBody
            onDelete={handleDelete}
            scrollBgClass="bg-warm"
          />
          <RelationshipsActionBar menuSlot={menuTrigger} />
        </div>
  );

  return (
    <>
    <AdaptiveSplitView
      // On mobile the relationships panel (`left`) is already the full-screen
      // view, so we only surface the Document in a bottom sheet — a
      // "Relationships" section here would just duplicate what's behind it.
      mobileSections={[
        {
          id: "document",
          label: "Document",
          content: (
            <div className="flex flex-col h-full min-h-0 relative overflow-hidden">
              <EntityOverlay />
              <DocumentViewer />
            </div>
          ),
        },
      ]}
      left={renderLeft()}
      mobileLeft={(menuTrigger) => renderLeft(menuTrigger)}
      right={
        <div className="flex flex-col h-full min-h-0 relative overflow-hidden">
          <EntityOverlay />
          {/* The document projection only makes sense for document-bearing
              entities — otherwise the viewer falls back to the sample PDF. */}
          {profile.hasDocument && (
            <DrawerTabs
              tabs={[{ id: "document", label: "Document" }]}
              activeId="document"
              onChange={() => {}}
            />
          )}
          <RelationshipsFiltersPanel width={720} />
          {profile.hasDocument ? (
            <DocumentViewer showMinimap={!hideMinimap} />
          ) : (
            /* No bundled document — show the shared placeholder PDF rather than a
               bare empty state (the real doc isn't shipped in this sample). */
            <DocumentViewer fileOverride={MOCK_DOCUMENT_FILE} showMinimap={false} />
          )}
          {deleteDialog}
        </div>
      }
      defaultRightWidth={560}
      minRightWidth={460}
    />
    </>
  );
}
