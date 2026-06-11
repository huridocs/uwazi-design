import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { Navbar } from "./components/layout/Navbar";
import { EntityView } from "./views/EntityView";
import { LibraryView } from "./views/LibraryView";
import { ComponentCatalog } from "./views/ComponentCatalog";
import { ImportCSVView } from "./views/ImportCSVView";
import { ToastContainer } from "./views/ToastContainer";
import { AgentModal } from "./components/agent/AgentModal";
import { themeAtom, resolveTheme } from "./atoms/theme";
import { languageAtom } from "./atoms/language";
import { appViewAtom, type AppView } from "./atoms/navigation";
import { useBreakpointSync } from "./hooks/useBreakpointSync";

export function App() {
  useBreakpointSync();
  const [appView, setAppView] = useAtom(appViewAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const [language, setLanguage] = useAtom(languageAtom);
  const [rtl, setRtl] = useState(false);

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
    setRtl((r) => {
      const next = !r;
      setLanguage(next ? "AR" : "EN");
      return next;
    });
  };

  const handleLogoClick = () => {
    // Logo toggles the component catalog; returning lands on the Library home.
    setAppView(appView === "catalog" ? "library" : "catalog");
  };

  const handleNavigate = (view: AppView) => {
    setAppView(view);
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
        ) : appView === "library" ? (
          <LibraryView />
        ) : (
          <EntityView />
        )}
      </div>
      <AgentModal />
    </div>
  );
}
