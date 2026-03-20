import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { Navbar } from "./components/layout/Navbar";
import { ReferencesView } from "./views/ReferencesView";
import { ComponentCatalog } from "./views/ComponentCatalog";
import { ImportCSVView } from "./views/ImportCSVView";
import { ToastContainer } from "./views/ToastContainer";
import { themeAtom } from "./atoms/theme";
import { languageAtom } from "./atoms/language";
import { appViewAtom, type AppView } from "./atoms/navigation";

export function App() {
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

  return (
    <div className="h-full flex flex-col">
      <Navbar
        onLogoClick={handleLogoClick}
        appView={appView}
        onNavigate={handleNavigate}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        rtl={rtl}
        onToggleRtl={handleToggleRtl}
      />
      {appView === "catalog" ? (
        <ComponentCatalog />
      ) : appView === "import-csv" ? (
        <ImportCSVView />
      ) : (
        <ReferencesView />
      )}
      <ToastContainer />
    </div>
  );
}
