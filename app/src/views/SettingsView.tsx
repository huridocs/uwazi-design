import { useAtomValue } from "jotai";
import {
  blockedSettingsSectionAtom,
  effectiveSettingsSectionAtom,
  firstAllowedSettingsSectionAtom,
  settingsItemsById,
  settingsMobileDrilledAtom,
  settingsSectionAllowed,
  settingsSectionAtom,
} from "../atoms/settings";
import { signedInUserAtom } from "../atoms/users";
import { SettingsContent } from "../components/settings/SettingsContent";
import { SettingsEmptyState } from "../components/settings/SettingsEmptyState";
import { useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { dataSourceAtom } from "../atoms/dataSource";
import { breakpointAtom } from "../atoms/viewport";
import type { AppView } from "../atoms/navigation";
import { SettingsNav } from "../components/settings/SettingsNav";
import { useLoadSettingsCorpus } from "../hooks/useSettingsCorpus";
import { SettingsCorpusError } from "../components/shared/SettingsCorpusError";
import { AccountPage } from "../components/settings/pages/AccountPage";
import { LanguagesPage } from "../components/settings/pages/LanguagesPage";
import { UsersPage } from "../components/settings/pages/UsersPage";
import { CollectionPage } from "../components/settings/pages/CollectionPage";
import { TemplatesPage } from "../components/settings/pages/TemplatesPage";
import { ThesauriPage } from "../components/settings/pages/ThesauriPage";
import { RelationTypesPage } from "../components/settings/pages/RelationTypesPage";
import { TranslationsPage } from "../components/settings/pages/TranslationsPage";
import { PagesPage } from "../components/settings/pages/PagesPage";
import { ActivityLogPage } from "../components/settings/pages/ActivityLogPage";
import { DashboardPage } from "../components/settings/pages/DashboardPage";
import { MenuPage } from "../components/settings/pages/MenuPage";
import { FiltersPage } from "../components/settings/pages/FiltersPage";
import { MetadataExtractionPage } from "../components/settings/pages/MetadataExtractionPage";
import { ParagraphExtractionPage } from "../components/settings/pages/ParagraphExtractionPage";
import { PreservePage } from "../components/settings/pages/PreservePage";
import { UploadsPage } from "../components/settings/pages/UploadsPage";
import { CustomisationPage } from "../components/settings/pages/CustomisationPage";
import { PlaceholderPage } from "../components/settings/pages/PlaceholderPage";

/** Settings takeover — a fixed-width rail + content outlet, mirroring Uwazi's
 *  V2 Settings shell. Cloned pages render natively; the rest fall back to a
 *  placeholder so the whole IA is navigable. */
export function SettingsView({ onNavigate }: { onNavigate?: (view: AppView) => void }) {
  // A section the signed-in role cannot reach says so and offers the first
  // one it can (a stored section can outlive a sign-in or a role change);
  // the rail marks no item for it.
  const section = useAtomValue(effectiveSettingsSectionAtom);
  const drilled = useAtomValue(settingsMobileDrilledAtom);
  const isMobile = useAtomValue(breakpointAtom) === "mobile";
  // Pages init their useState from the active source; remount on a source flip
  // (rail toggle) so their tables re-seed from CEJIL ↔ Sample.
  const dataSource = useAtomValue(dataSourceAtom);
  const { retry } = useLoadSettingsCorpus();

  const blocked = useAtomValue(blockedSettingsSectionAtom);
  const page = (() => {
    if (blocked) return <BlockedSettingsPage section={blocked} />;
    switch (section) {
      case "account":
        return <AccountPage />;
      case "languages":
        return <LanguagesPage />;
      case "users":
        return <UsersPage />;
      case "collection":
        return <CollectionPage />;
      case "templates":
        return <TemplatesPage />;
      case "thesauri":
        return <ThesauriPage />;
      case "relationship-types":
        return <RelationTypesPage />;
      case "translations":
        return <TranslationsPage />;
      case "pages":
        return <PagesPage />;
      case "activitylog":
        return <ActivityLogPage />;
      case "dashboard":
        return <DashboardPage />;
      case "menu":
        return <MenuPage />;
      case "filters":
        return <FiltersPage />;
      case "metadata-extraction":
        return <MetadataExtractionPage />;
      case "paragraph-extraction":
        return <ParagraphExtractionPage />;
      case "preserve":
        return <PreservePage />;
      case "uploads":
        return <UploadsPage />;
      case "customisation":
        return <CustomisationPage />;
      default:
        return <PlaceholderPage section={section} />;
    }
  })();

  // A load failure shows above the page; the page still works.
  const content = (
    <div className="h-full min-h-0 flex flex-col">
      <SettingsCorpusError onRetry={retry} />
      <div className="flex-1 min-h-0">{page}</div>
    </div>
  );

  // Mobile drills in: rail until a section is picked, then the section
  // full-width (its header carries the back chevron). Desktop shows both.
  if (isMobile) {
    return (
      <div className="h-full min-h-0">
        {drilled ? <div key={dataSource} className="h-full min-h-0">{content}</div> : <SettingsNav onNavigate={onNavigate} />}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <SettingsNav onNavigate={onNavigate} />
      <div key={dataSource} className="flex-1 min-w-0 min-h-0">{content}</div>
    </div>
  );
}

const ROLE_NAMES = { admin: "an admin", editor: "an editor", collaborator: "a collaborator" } as const;

/** A section the signed-in role cannot open: what it is, why, and the way to
 *  the first section the role reaches. Focus lands on the heading. */
function BlockedSettingsPage({ section }: { section: string }) {
  const role = useAtomValue(signedInUserAtom)?.role;
  const first = useAtomValue(firstAllowedSettingsSectionAtom);
  const setSection = useSetAtom(settingsSectionAtom);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const heading = ref.current?.querySelector<HTMLElement>("h1, h2");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus();
  }, [section]);
  const name = settingsItemsById[section]?.label ?? "This page";
  const firstName = settingsItemsById[first]?.label ?? "Account";
  return (
    <div ref={ref} className="h-full">
      <SettingsContent component="BlockedSettingsPage">
        <SettingsContent.Header title="This page is not available." />
        <SettingsContent.Body>
          <SettingsEmptyState
            title={`${name} is open to ${settingsSectionAllowed("editor", section) ? "admins and editors" : "admins"} only.`}
            hint={`You are signed in as ${role ? ROLE_NAMES[role] : "a user"}, and your role cannot open it.`}
            action={{ label: `Go to ${firstName}`, onClick: () => setSection(first) }}
          />
        </SettingsContent.Body>
      </SettingsContent>
    </div>
  );
}
