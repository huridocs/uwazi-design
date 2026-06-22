import { useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { DrawerTabs } from "../../layout/DrawerTabs";
import { toastsAtom } from "../../../atoms/references";

const SAMPLE_CSS = `/* Global CSS — applied across the public collection */
.home-banner {
  background: var(--bg-parchment);
}`;

const SAMPLE_JS = `// Global JS — runs on every public page
console.log('Collection loaded');`;

export function CustomisationPage() {
  const setToasts = useSetAtom(toastsAtom);
  const [lang, setLang] = useState<"css" | "js">("css");
  const [css, setCss] = useState(SAMPLE_CSS);
  const [js, setJs] = useState(SAMPLE_JS);

  const gutterRef = useRef<HTMLDivElement>(null);

  const value = lang === "css" ? css : js;
  const sample = lang === "css" ? SAMPLE_CSS : SAMPLE_JS;
  const tabDirty = value !== sample;
  const dirty = css !== SAMPLE_CSS || js !== SAMPLE_JS;

  const lineCount = value.split("\n").length;
  const charCount = value.length;

  const save = () =>
    setToasts((p) => [...p, { id: Date.now().toString(), message: "Customisation saved", type: "success" as const }]);

  const resetTab = () => {
    if (lang === "css") setCss(SAMPLE_CSS);
    else setJs(SAMPLE_JS);
  };

  const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
  };

  return (
    <SettingsContent>
      <SettingsContent.Header title="Global CSS & JS" />
      <SettingsContent.Body className="flex flex-col min-h-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
          <p className="text-xs text-ink-tertiary">
            Custom styles and scripts injected into the public-facing collection.
          </p>
          <DrawerTabs
            className=""
            activeId={lang}
            onChange={(v) => setLang(v as "css" | "js")}
            tabs={[
              { id: "css", label: "CSS" },
              { id: "js", label: "JS" },
            ]}
          />
        </div>

        {/* Editor toolbar */}
        <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs bg-vellum border border-border rounded-md rounded-b-none border-b-0">
          <div className="flex items-center gap-2 text-ink-tertiary">
            <span className="font-mono uppercase text-ink-secondary">{lang}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">
              {lineCount} {lineCount === 1 ? "line" : "lines"} · {charCount} {charCount === 1 ? "char" : "chars"}
            </span>
          </div>
          <button
            type="button"
            disabled={!tabDirty}
            onClick={resetTab}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-ink-secondary hover:bg-warm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </button>
        </div>

        {/* Line-numbered editor */}
        <div className="flex flex-1 min-h-[20rem] w-full overflow-hidden border border-border rounded-md rounded-t-none">
          <div
            ref={gutterRef}
            aria-hidden
            className="shrink-0 overflow-hidden py-4 pl-3 pr-2 text-sm font-mono leading-6 text-ink-muted text-right tabular-nums select-none bg-vellum"
            style={{ borderRight: "1px solid var(--border-soft)" }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            value={value}
            onChange={(e) => (lang === "css" ? setCss(e.target.value) : setJs(e.target.value))}
            onScroll={syncScroll}
            spellCheck={false}
            dir="ltr"
            className="flex-1 min-w-0 py-4 px-3 text-sm font-mono leading-6 text-ink bg-warm resize-none focus:outline-none"
          />
        </div>

        {/* Per-language note */}
        {lang === "js" ? (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 text-xs text-warning bg-warning-light rounded-md">
            <AlertTriangle className="size-3.5 shrink-0" />
            Scripts run on every public page — use with care.
          </div>
        ) : (
          <p className="mt-2 px-3 text-xs text-ink-tertiary">
            Styles cascade over the public theme — scope selectors to avoid surprises.
          </p>
        )}
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="success" size="sm" disabled={!dirty} onClick={save}>
          Save
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
