import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { SegmentedControl } from "../shared/SegmentedControl";
import { expandComponents, publicDocument, type RenderContext, type SiteChrome } from "../../utils/sitePageRender";

/** The public page, live, beside the editor.
 *
 *  The draft is rendered into an `<iframe srcdoc>` a short debounce after the
 *  last change — the page's own CSS and JS run inside it, sandboxed without
 *  same-origin, so a broken script shows up here and not on the site. For real,
 *  this is an iframe on the `page-draft/:sharedId` route fed over postMessage
 *  (the Mantel pattern); srcdoc keeps the mock self-contained. */
export function PublicPreview({
  html,
  css,
  js,
  chrome,
  ctx,
  loading,
  debounce = 250,
  path = "/page/…",
  className = "",
}: {
  /** The public URL the page lives at, shown beside the label. */
  path?: string;
  html: string;
  css: string;
  js: string;
  chrome: SiteChrome;
  ctx: RenderContext;
  loading?: boolean;
  debounce?: number;
  className?: string;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const doc = useMemo(() => publicDocument(expandComponents(html, ctx), css, js, chrome), [html, css, js, chrome, ctx]);
  const [shown, setShown] = useState(doc);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(doc), debounce);
    return () => window.clearTimeout(t);
  }, [doc, debounce]);

  return (
    <div data-component="PublicPreview" className={`flex flex-col min-h-0 ${className}`}>
      <div data-part="bar" className="flex items-center gap-2 h-10 shrink-0">
        <span className="text-xs font-medium text-ink-secondary">Preview</span>
        <span className="text-meta text-ink-tertiary truncate min-w-0" dir="ltr">{path}</span>
        <span className="flex-1" />
        <span className="hidden md:inline-flex">
          <SegmentedControl
            size="sm"
            ariaLabel="Preview width"
            value={device}
            onChange={(v) => setDevice(v as "desktop" | "mobile")}
            options={[
              { id: "desktop", label: "Desktop" },
              { id: "mobile", label: "Phone" },
            ]}
          />
        </span>
        <span className="inline-flex items-center gap-1 text-meta text-ink-tertiary" title="Opens the draft on its own (not in this mock)">
          <ExternalLink size={12} aria-hidden /> Open
        </span>
      </div>
      <div data-part="stage" className="relative flex-1 min-h-0 rounded-md border border-border bg-vellum p-2 flex justify-center overflow-hidden">
        <iframe
          title="Public page preview"
          sandbox="allow-scripts"
          srcDoc={shown}
          className="h-full rounded-[4px] border border-border bg-white transition-[width] duration-200"
          style={{ width: device === "mobile" ? 390 : "100%", maxWidth: "100%" }}
        />
        {loading && (
          <div className="absolute inset-0 grid place-items-center bg-vellum/70 text-xs text-ink-tertiary" aria-live="polite">
            Loading the collection…
          </div>
        )}
      </div>
    </div>
  );
}
