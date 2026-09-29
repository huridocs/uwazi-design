import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { loadDoc, saveDoc } from "./lib/store";
import { useEditor } from "./builder/state";
import { Builder } from "./builder/Builder";
import { FirstRun } from "./builder/FirstRun";

function App() {
  const editor = useEditor(loadDoc());
  if (!editor.doc) return <FirstRun onCreate={(config) => editor.dispatch({ type: "create", config })} />;
  return (
    // Keyed on the collection only: changing the site type (or undoing it)
    // must not remount the builder and lose the open panel, device and notice.
    // Start over unmounts it anyway, through FirstRun.
    <Builder
      key={editor.doc.draft.collection}
      editor={editor}
      onStartOver={() => {
        saveDoc(null);
        editor.dispatch({ type: "reset" });
      }}
    />
  );
}

// The builder follows the device's light or dark setting; the site being
// built has its own (Whole site › Theme).
const dark = matchMedia("(prefers-color-scheme: dark)");
const applyScheme = () => document.documentElement.classList.toggle("dark", dark.matches);
applyScheme();
dark.addEventListener("change", applyScheme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
