import { useEffect } from "react";
import { useAtom } from "jotai";
import { Navbar } from "./components/layout/Navbar";
import { EntityView } from "./views/EntityView";
import { LibraryView } from "./views/LibraryView";
import { ComponentCatalog } from "./views/ComponentCatalog";
import { ImportCSVView } from "./views/ImportCSVView";
import { SettingsView } from "./views/SettingsView";
import { ToastContainer } from "./views/ToastContainer";
import { AgentModal } from "./components/agent/AgentModal";
import { UnsavedChangesGuard } from "./components/shared/UnsavedChangesGuard";
import { themeAtom, resolveTheme } from "./atoms/theme";
import { languageAtom } from "./atoms/language";
import { appViewAtom, type AppView } from "./atoms/navigation";
import { useBreakpointSync } from "./hooks/useBreakpointSync";
import { useDirtyGuard } from "./hooks/useDirtyGuard";

export function App() {
  useBreakpointSync();
  const [appView, setAppView] = useAtom(appViewAtom);
  const guard = useDirtyGuard();
  const [theme, setTheme] = useAtom(themeAtom);
  const [language, setLanguage] = useAtom(languageAtom);
  // Direction derives from the reading language — selecting AR anywhere
  // (language pills or the navbar toggle) flips the document, and leaving
  // AR restores LTR. No separate direction state to fall out of sync.
  const rtl = language === "AR";

  useEffect(() => {
    const apply = () =>
      document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark");
    apply();
    localStorage.setItem("theme", theme);
    if (theme !== "auto") return;
    // Follow OS preference live while in auto mode.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dir = rtl ? "rtl" : "ltr";
  }, [rtl]);

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
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar
        onLogoClick={handleLogoClick}
        appView={appView}
        onNavigate={handleNavigate}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        rtl={rtl}
        onToggleRtl={handleToggleRtl}
      />
      <div className="flex-1 min-h-0 flex flex-col">
        {appView === "import-csv" ? (
          <ImportCSVView />
        ) : appView === "settings" ? (
          <SettingsView onNavigate={handleNavigate} />
        ) : appView === "library" ? (
          <LibraryView />
        ) : (
          <EntityView />
        )}
      </div>
      <AgentModal />
      <UnsavedChangesGuard />
    </div>
  );
}
