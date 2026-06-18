import { useAtomValue } from "jotai";
import { settingsSectionAtom, settingsMobileDrilledAtom } from "../atoms/settings";
import { breakpointAtom } from "../atoms/viewport";
import type { AppView } from "../atoms/navigation";
import { SettingsNav } from "../components/settings/SettingsNav";
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
  const section = useAtomValue(settingsSectionAtom);
  const drilled = useAtomValue(settingsMobileDrilledAtom);
  const isMobile = useAtomValue(breakpointAtom) === "mobile";

  const page = (() => {
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

  // Mobile drills in: rail until a section is picked, then the section
  // full-width (its header carries the back chevron). Desktop shows both.
  if (isMobile) {
    return (
      <div className="h-full min-h-0">
        {drilled ? page : <SettingsNav onNavigate={onNavigate} />}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <SettingsNav onNavigate={onNavigate} />
      <div className="flex-1 min-w-0 min-h-0">{page}</div>
    </div>
  );
}
