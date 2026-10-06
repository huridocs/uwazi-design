import { useRelAtom } from "../hooks/useEntityScope";
import { useState, type ReactNode } from "react";
import { useAtom, useAtomValue } from "jotai";
import { LANGUAGES, languageAtom, type Language } from "../atoms/language";
import { focusedEntityIdAtom } from "../atoms/focusedEntity";
import { getEntityProfile } from "../data/entityProfiles";
import { activeFilterCountAtom, relViewAtom } from "../atoms/filters";
import { t } from "../utils/i18n";
import { RelationshipsFiltersTab, useRelFiltersDock } from "../components/relationships/RelationshipsFiltersTab";
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
import { nepalClaimEvidence } from "../data/nepal/claimEvidence";
import { ClaimEvidenceBlock } from "../components/relationships/ClaimEvidence";

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
  const [chosenDrawerTab, setDrawerTab] = useState<"document" | "filters">("document");
  useRelFiltersDock(() => setDrawerTab("filters"));
  const relFilterCount = useAtomValue(activeFilterCountAtom);

  const hideMinimap = view === "graph";
  const sourceLink = profile.hasDocument ? undefined : nepalSourceLink(focusedId);
  // A record with no file and no source link has nothing for a Document tab
  // to show: the drawer drops the tab and opens on Filters, whatever tab the
  // previous record left open.
  const hasDocTab = profile.hasDocument || !!sourceLink;
  const drawerTab = hasDocTab ? chosenDrawerTab : "filters";
  // A claim opens on its evidence; undefined for every record no source takes
  // a stance on, so the block is not drawn.
  const evidence = nepalClaimEvidence(focusedId);

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
            lead={evidence && <ClaimEvidenceBlock ev={evidence} />}
          />
          <RelationshipsActionBar menuSlot={menuTrigger} />
          {/* Phones only: there the drawer is not shown, and Filters opens
              the sheet. A desktop or tablet docks them in the drawer. */}
          <RelationshipsFiltersPanel />
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
          {/* The record's document (or its source's link, or the note that it
              has none), then the filters as a tab of their own. */}
          <DrawerTabs
            tabs={[
              ...(hasDocTab ? [{ id: "document", label: profile.hasDocument ? "Document" : "Source" }] : []),
              { id: "filters", label: t("System", "Filters"), dot: relFilterCount > 0 },
            ]}
            activeId={drawerTab}
            onChange={(id) => setDrawerTab(id as "document" | "filters")}
          />
          {/* The viewer stays mounted under the Filters tab: a remounted PDF
              paints blank canvases. One `stack` step below the strip. */}
          <div className={`flex-1 min-h-0 flex-col pt-stack ${drawerTab === "document" ? "flex" : "hidden"}`}>
          {profile.hasDocument ? (
            <DocumentViewer showMinimap={!hideMinimap} />
          ) : (
            sourceLink && <NoDocumentPane entityId={focusedId} />
          )}
          </div>
          {drawerTab === "filters" && <RelationshipsFiltersTab />}
          {deleteDialog}
        </div>
      }
      defaultRightWidth={560}
      minRightWidth={DRAWER_MIN_WIDTH}
    />
    </>
  );
}
