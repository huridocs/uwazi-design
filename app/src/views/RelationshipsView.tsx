import { useRelAtom } from "../hooks/useEntityScope";
import { type ReactNode } from "react";
import { useAtom } from "jotai";
import { LANGUAGES, languageAtom, type Language } from "../atoms/language";
import { focusedEntityIdAtom } from "../atoms/focusedEntity";
import { getEntityProfile } from "../data/entityProfiles";
import { relViewAtom } from "../atoms/filters";
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
import { EntityPreviewSlideOver } from "../components/relationships/EntityPreviewSlideOver";
import { RelationshipsPanelBody } from "../components/relationships/RelationshipsPanelBody";
import { RelationshipsActionBar } from "../components/relationships/RelationshipsActionBar";
import { DRAWER_MIN_WIDTH } from "../hooks/useDrawerWidth";
import { NoDocumentPane } from "../components/entity/NoDocumentPane";
import { nepalSourceLink } from "../data/nepal/sourceLink";

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
  const [view] = useRelAtom(relViewAtom);
  const { handleDelete, dialog: deleteDialog } = useReferenceDelete();

  const hideMinimap = view === "graph";
  const sourceLink = profile.hasDocument ? undefined : nepalSourceLink(focusedId);

  const renderLeft = (menuTrigger?: ReactNode) => (
        // The narrow-tier gutter host: tabs, DocMeta, toolbar, lane and action
        // bar all take their side inset from this padding (see `gutter-host`).
        <div data-gutter-host className="gutter-host flex flex-col h-full min-h-0 bg-paper relative overflow-clip">
          <MainTabs
            tabs={tabs}
            activeId={activeTab}
            onChange={onTabChange}
            onBack={onBack}
            languages={LANGUAGES}
            availableLanguages={LANGUAGES}
            activeLanguage={language}
            onLanguageChange={(lang) => setLanguage(lang as Language)}
          />
          <DocMeta showPdfSelector={false} />

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
      // view, so we only surface the Document (or a Source's link) in a bottom
      // sheet — a "Relationships" section here would just duplicate what's
      // behind it.
      mobileSections={profile.hasDocument ? [
        {
          id: "document",
          label: "Document",
          content: (
            <div data-gutter-host className="gutter-host flex flex-col h-full min-h-0 relative overflow-clip">
              <EntityPreviewSlideOver />
              <DocumentViewer />
            </div>
          ),
        },
      ] : sourceLink ? [
        {
          id: "source",
          label: "Source",
          content: (
            <div data-gutter-host className="gutter-host flex flex-col h-full min-h-0">
              <NoDocumentPane entityId={focusedId} />
            </div>
          ),
        },
      ] : []}
      left={renderLeft()}
      mobileLeft={(menuTrigger) => renderLeft(menuTrigger)}
      right={
        <div data-gutter-host className="gutter-host flex flex-col h-full min-h-0 relative overflow-clip">
          <EntityPreviewSlideOver />
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
          {/* One `stack` step below the strip; the strip itself pads only its top. */}
          <div className={`flex-1 min-h-0 flex flex-col ${profile.hasDocument ? "pt-stack" : ""}`}>
          {profile.hasDocument ? (
            <DocumentViewer showMinimap={!hideMinimap} />
          ) : (
            <NoDocumentPane entityId={focusedId} />
          )}
          </div>
          {deleteDialog}
        </div>
      }
      defaultRightWidth={560}
      minRightWidth={DRAWER_MIN_WIDTH}
    />
    </>
  );
}
