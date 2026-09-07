import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ThemeEffect, primeTheme } from "./components/shared/ThemeEffect";
import "./index.css";

// Before the first render: a dark-mode reader should never see a light frame.
primeTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* A leaf, outside the app: the theme is a document-level fact, and nothing
        in React re-renders when it changes. */}
    <ThemeEffect />
    <App />
  </StrictMode>
);
