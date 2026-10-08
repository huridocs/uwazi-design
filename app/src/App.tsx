import { useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { collectionSettings } from "./atoms/settingsSingletons";
import { uploadsAtom } from "./atoms/uploads";
import { setActiveDatePattern } from "./utils/dateFormat";
import { settingsAccessAtom } from "./atoms/settings";
import { useCsvImportRunner } from "./atoms/csvImports";
import { Navbar } from "./components/layout/Navbar";
import { EntityView } from "./views/EntityView";
import { PublishedViewToggle } from "./components/entity/PublishedEntityView";
import { LibraryView } from "./views/LibraryView";
import { ComponentCatalog } from "./views/ComponentCatalog";
import { ImportCSVView } from "./views/ImportCSVView";
import { SettingsView } from "./views/SettingsView";
import { ToastContainer } from "./views/ToastContainer";
import { AgentModal } from "./components/agent/AgentModal";
import { MobileOverlayStack } from "./components/relationships/MobileOverlayStack";
import { UnsavedChangesGuard } from "./components/shared/UnsavedChangesGuard";
import { languageAtom } from "./atoms/language";
import { appViewAtom, type AppView } from "./atoms/navigation";
import { useBreakpointSync } from "./hooks/useBreakpointSync";
import { useKeyboardInset } from "./hooks/useKeyboardInset";
import { useDirtyGuard } from "./hooks/useDirtyGuard";

export function App() {
  useBreakpointSync();
  // `--kb`: the on-screen keyboard's height, for bottom-anchored layers.
  useKeyboardInset();
  const [appView, setAppView] = useAtom(appViewAtom);
  const guard = useDirtyGuard();
  const [language, setLanguage] = useAtom(languageAtom);
  // Direction derives from the reading language — selecting AR anywhere
  // (language pills or the navbar toggle) flips the document, and leaving
  // AR restores LTR. No separate direction state to fall out of sync.
  const rtl = language === "AR";

  useEffect(() => {
    document.documentElement.dir = rtl ? "rtl" : "ltr";
  }, [rtl]);

  // Import CSV jobs run whatever view is open.
  useCsvImportRunner();
  // Import CSV is an admin page (Uwazi: adminsOnlyRoute); a session on it for
  // another role lands on the Library.
  const canImport = useAtomValue(settingsAccessAtom)("import-csv");
  useEffect(() => {
    if (appView === "import-csv" && !canImport) setAppView("library");
  }, [appView, canImport, setAppView]);

  // The window title is the collection's name (Settings › Collection).
  const collection = useAtomValue(collectionSettings.valueAtom);
  const collectionName = collection.name;
  useEffect(() => {
    document.title = collectionName ? `${collectionName} · Uwazi` : "Uwazi";
  }, [collectionName]);
  // Dates print in the collection's format. Set during render, before the
  // children that print dates render with it (`utils/dateFormat.ts`).
  setActiveDatePattern(collection.dateFormat);
  // The favicon is the chosen upload, else the Uwazi mark. Uwazi needs a
  // reload for this; the prototype swaps it on Save.
  const faviconSrc = useAtomValue(uploadsAtom).find((u) => u.id === collection.favicon)?.src;
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    if (faviconSrc) {
      link.removeAttribute("type");
      link.href = faviconSrc;
    } else {
      link.type = "image/svg+xml";
      // Under the build's base, as index.html links it (GitHub Pages serves
      // the app from /uwazi-design/…, not the domain root).
      link.href = `${import.meta.env.BASE_URL}favicon.svg`;
    }
  }, [faviconSrc]);

  const handleToggleRtl = () => {
    setLanguage(rtl ? "EN" : "AR");
  };

  const handleLogoClick = () => {
    // Logo toggles the component catalog; returning lands on the Library home.
    guard(() => setAppView(appView === "catalog" ? "library" : "catalog"));
  };

  // The top-level view switch is a navigation choke point: a dirty form gets
  // to object before the surface underneath it is swapped out.
  const handleNavigate = (view: AppView) => {
    if (view === appView) return;
    guard(() => setAppView(view));
  };

  // The catalog has its own self-contained layout (its own header, its own
  // scroll containers) — it doesn't share the uwazi-app shell. That keeps the
  // two surfaces from fighting over height propagation through a common
  // ancestor. The uwazi-app shell renders Navbar + main flex column for
  // EntityView / ImportCSVView.
  if (appView === "catalog") {
    return (
      <>
        <ComponentCatalog onReturn={() => setAppView("library")} />
        <ToastContainer />
        <AgentModal />
        <UnsavedChangesGuard />
      </>
    );
  }

  return (
    // `app-shell` (index.css): the DYNAMIC viewport height, not 100vh, which on
    // iOS includes the collapsing URL bar and put every bottom bar under it.
    <div className="app-shell flex flex-col overflow-hidden">
      <Navbar
        onLogoClick={handleLogoClick}
        appView={appView}
        onNavigate={handleNavigate}
        rtl={rtl}
        onToggleRtl={handleToggleRtl}
      />
      {/* Before the view in the tab order, floating over the navbar's edge. */}
      {appView === "entity" && <PublishedViewToggle />}
      <div className="flex-1 min-h-0 flex flex-col">
        {appView === "import-csv" && canImport ? (
          <ImportCSVView onNavigate={handleNavigate} />
        ) : appView === "settings" ? (
          <SettingsView onNavigate={handleNavigate} />
        ) : appView === "library" ? (
          <LibraryView />
        ) : (
          <EntityView />
        )}
      </div>
      {/* Phones: the connection overlay's sheets, once for every view. */}
      <MobileOverlayStack />
      <AgentModal />
      <UnsavedChangesGuard />
    </div>
  );
}
