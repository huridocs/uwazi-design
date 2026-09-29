import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import type { SiteConfig } from "./model/config";
import { Site } from "./render/Site";
import { clearQueryCache, parseHash, routeHref, type Route } from "./render/context";
import { sourceFor } from "./lib/sources";
import { loadPublished } from "./lib/store";
import { isFromFrame, type FromFrame, type ToFrame } from "./lib/protocol";

const preview = new URLSearchParams(location.search).has("preview");

function post(msg: FromFrame) {
  if (window.parent !== window) window.parent.postMessage(msg, location.origin);
}

/** Standalone: the published site, routed by the URL hash. */
function Published() {
  const [config] = useState<SiteConfig | null>(() => loadPublished());
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash, config?.defaultLanguage ?? "en", config?.languages ?? ["en"]));
  useEffect(() => {
    const on = () => config && setRoute(parseHash(location.hash, config.defaultLanguage, config.languages));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, [config]);
  if (!config)
    return (
      <main className="min-h-screen grid place-items-center bg-paper p-6">
        <div className="max-w-md flex flex-col gap-3">
          <h1 className="text-2xl font-semibold text-ink">Nothing published yet</h1>
          <p className="text-ink-secondary">This site has no published version. Open the builder, make a site, and press Publish.</p>
          <a className="text-carbon underline underline-offset-2" href="./">
            Open the builder
          </a>
        </div>
      </main>
    );
  return (
    <Site
      config={config}
      ds={sourceFor(config.collection)}
      route={route}
      onNavigate={(r) => {
        location.hash = routeHref(r);
        window.scrollTo(0, 0);
      }}
    />
  );
}

/** In the builder's frame: the draft, sent over postMessage. */
function Preview() {
  const [state, setState] = useState<ToFrame | null>(null);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== window.parent) return;
      const d = e.data as ToFrame;
      if (d?.type !== "sites:config") return;
      setState((prev) => {
        if (prev && prev.config.collection !== d.config.collection) clearQueryCache();
        if (prev && (prev.route.slug !== d.route.slug || prev.route.entity !== d.route.entity)) window.scrollTo(0, 0);
        return d;
      });
    };
    window.addEventListener("message", on);
    post({ type: "sites:ready" });
    return () => window.removeEventListener("message", on);
  }, []);
  // Scroll the selected block into view when the editor selects it.
  useEffect(() => {
    if (!state?.selected) return;
    const el = document.querySelector(`[data-block-id="${state.selected}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 64 || r.top > innerHeight - 80) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state?.selected]);
  if (!state) return <div className="min-h-screen bg-paper" />;
  return (
    <Site
      config={state.config}
      ds={sourceFor(state.config.collection)}
      route={state.route}
      preview
      selected={state.selected}
      onSelect={(id) => post({ type: "sites:select", id })}
      onNavigate={(route) => post({ type: "sites:navigate", route })}
    />
  );
}

void isFromFrame;
createRoot(document.getElementById("root")!).render(<StrictMode>{preview ? <Preview /> : <Published />}</StrictMode>);
