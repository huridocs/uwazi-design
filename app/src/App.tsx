import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { Navbar } from "./components/layout/Navbar";
import { EntityView } from "./views/EntityView";
import { ComponentCatalog } from "./views/ComponentCatalog";
import { ImportCSVView } from "./views/ImportCSVView";
import { ToastContainer } from "./views/ToastContainer";
import { themeAtom } from "./atoms/theme";
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
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
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
    if (appView === "entity") {
      setAppView("catalog");
    } else {
      setAppView("entity");
    }
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
        <ComponentCatalog onReturn={() => setAppView("entity")} />
        <ToastContainer />
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
        onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        rtl={rtl}
        onToggleRtl={handleToggleRtl}
      />
      <div className="flex-1 min-h-0 flex flex-col">
        {appView === "import-csv" ? <ImportCSVView /> : <EntityView />}
      </div>
      <ToastContainer />
    </div>
  );
}
