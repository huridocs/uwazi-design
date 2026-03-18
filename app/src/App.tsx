import { useState } from "react";
import { Navbar } from "./components/layout/Navbar";
import { ReferencesView } from "./views/ReferencesView";
import { ComponentCatalog } from "./views/ComponentCatalog";

export function App() {
  const [showCatalog, setShowCatalog] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <Navbar
        onLogoClick={() => setShowCatalog((prev) => !prev)}
        showingCatalog={showCatalog}
      />
      {showCatalog ? <ComponentCatalog /> : <ReferencesView />}
    </div>
  );
}
