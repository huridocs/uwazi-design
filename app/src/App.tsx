import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { Navbar } from "./components/layout/Navbar";
import { ReferencesView } from "./views/ReferencesView";
import { ComponentCatalog } from "./views/ComponentCatalog";
import { ToastContainer } from "./views/ToastContainer";
import { themeAtom } from "./atoms/theme";
import { languageAtom } from "./atoms/language";

export function App() {
  const [showCatalog, setShowCatalog] = useState(false);
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

  return (
    <div className="h-full flex flex-col">
      <Navbar
        onLogoClick={() => setShowCatalog((prev) => !prev)}
        showingCatalog={showCatalog}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        rtl={rtl}
        onToggleRtl={handleToggleRtl}
      />
      {showCatalog ? <ComponentCatalog /> : <ReferencesView />}
      <ToastContainer />
    </div>
  );
}
