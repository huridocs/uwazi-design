import { useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Navbar } from "./components/layout/Navbar";
import { EntityView } from "./views/EntityView";
import { LibraryView } from "./views/LibraryView";
import { ComponentCatalog } from "./views/ComponentCatalog";
import { ImportCSVView } from "./views/ImportCSVView";
import { SettingsView } from "./views/SettingsView";
import { LoginView } from "./views/LoginView";
import { ToastContainer } from "./views/ToastContainer";
import { AgentModal } from "./components/agent/AgentModal";
import { MobileOverlayStack } from "./components/relationships/MobileOverlayStack";
import { UnsavedChangesGuard } from "./components/shared/UnsavedChangesGuard";
import { languageAtom } from "./atoms/language";
import { appViewAtom, type AppView } from "./atoms/navigation";
import { signedInUserIdAtom, usersAtom } from "./atoms/users";
import { useBreakpointSync } from "./hooks/useBreakpointSync";
import { useKeyboardInset } from "./hooks/useKeyboardInset";
import { useDirtyGuard } from "./hooks/useDirtyGuard";

export function App() {
  useBreakpointSync();
  // `--kb`: the on-screen keyboard's height, for bottom-anchored layers.
  useKeyboardInset();
  const [appView, setAppView] = useAtom(appViewAtom);
  const guard = useDirtyGuard();
  const users = useAtomValue(usersAtom);
  const setSignedIn = useSetAtom(signedInUserIdAtom);
  const [language, setLanguage] = useAtom(languageAtom);
  // Direction derives from the reading language — selecting AR anywhere
  // (language pills or the navbar toggle) flips the document, and leaving
  // AR restores LTR. No separate direction state to fall out of sync.
  const rtl = language === "AR";

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
  // Logged out: the login screen alone, without the app's navbar.
  if (appView === "login") {
    return (
      <main data-part="view" data-view="login" className="app-shell flex flex-col">
        <LoginView
          onLoggedIn={(username) => {
            const user = users.find((u) => u.username === username);
            if (user) setSignedIn(user.id);
            setAppView("library");
          }}
        />
      </main>
    );
  }

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
    <div data-component="App" className="app-shell flex flex-col overflow-hidden">
      <Navbar
        onLogoClick={handleLogoClick}
        appView={appView}
        onNavigate={handleNavigate}
        rtl={rtl}
        onToggleRtl={handleToggleRtl}
      />
      {/* The document's one `main`: whichever view is switched in. */}
      <main data-part="view" data-view={appView} className="flex-1 min-h-0 flex flex-col">
        {appView === "import-csv" ? (
          <ImportCSVView onNavigate={handleNavigate} />
        ) : appView === "settings" ? (
          <SettingsView onNavigate={handleNavigate} />
        ) : appView === "library" ? (
          <LibraryView />
        ) : (
          <EntityView />
        )}
      </main>
      {/* Phones: the connection overlay's sheets, once for every view. */}
      <MobileOverlayStack />
      <AgentModal />
      <UnsavedChangesGuard />
    </div>
  );
}
