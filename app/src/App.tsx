import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { Navbar } from "./components/layout/Navbar";
import { ReferencesView } from "./views/ReferencesView";
import { ComponentCatalog } from "./views/ComponentCatalog";
import { ToastContainer } from "./views/ToastContainer";
import { themeAtom } from "./atoms/theme";

export function App() {
  const [showCatalog, setShowCatalog] = useState(false);
  const [theme, setTheme] = useAtom(themeAtom);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="h-full flex flex-col">
      <Navbar
        onLogoClick={() => setShowCatalog((prev) => !prev)}
        showingCatalog={showCatalog}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
      />
      {showCatalog ? <ComponentCatalog /> : <ReferencesView />}
      <ToastContainer />
    </div>
  );
}
