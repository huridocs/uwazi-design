import { useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { customisationSettings } from "../../../atoms/settingsSingletons";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { SettingsFormPage } from "../SettingsEditor";
import { DrawerTabs } from "../../layout/DrawerTabs";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { LastSavedLine } from "../../shared/LastSavedLine";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";


export function CustomisationPage() {
  const { record } = useSettingsNotify();
  const saveCustomisation = useSetAtom(customisationSettings.saveAtom);
  const [askReset, setAskReset] = useState(false);
  const [lang, setLang] = useState<"css" | "js">("css");
  // Compared with the last save, not the sample: after Save the page is clean.
  const { draft, setField, dirty, markSaved, discard, saved } = useSettingsDraft({
    id: "customisation",
    label: "CSS and JS edits",
    saved: useAtomValue(customisationSettings.valueAtom),
  });
  const { css, js } = draft;
  const setCss = setField("css");
  const setJs = setField("js");

  const gutterRef = useRef<HTMLDivElement>(null);

  const value = lang === "css" ? css : js;
  const tabDirty = value !== saved[lang];

  const lineCount = value.split("\n").length;
  const charCount = value.length;

  const save = () => {
    saveCustomisation({ value: { css, js } });
    markSaved();
    // The log names what changed by size, never the code itself.
    const lines = (t: string) => t.split("\n").length;
    record({
      method: "UPDATE",
      domain: "customisation",
      noun: "settings",
      id: "customisation",
      name: "Global CSS & JS",
      message: "Customisation saved",
      detail: `CSS ${lines(css)} lines, JS ${lines(js)} lines.`,
    });
  };

  const resetTab = () => {
    if (lang === "css") setCss(saved.css);
    else setJs(saved.js);
  };

  const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
  };

  return (
    <SettingsFormPage
      component="CustomisationPage"
      title="Global CSS & JS"
      intro="Custom styles and scripts injected into the public-facing collection."
      dirty={dirty}
      onSave={save}
      onDiscard={discard}
      wide
      fill
      footerStatus={<LastSavedLine domain="customisation" id="customisation" />}
      overlays={
        <ConfirmDelete
          open={askReset}
          title={`Reset ${lang.toUpperCase()}`}
          message={`Discard your unsaved ${lang.toUpperCase()} changes? The last saved version comes back.`}
          impact={null}
          confirmLabel="Reset"
          onConfirm={() => {
            resetTab();
            setAskReset(false);
          }}
          onCancel={() => setAskReset(false)}
        />
      }
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="mb-3">
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
              onClick={() => setAskReset(true)}
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
              className="shrink-0 overflow-hidden py-4 pl-3 pr-2 text-sm font-mono leading-6 text-ink-muted text-right tabular-nums select-none bg-vellum border-e border-border-soft"
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
      </div>
    </SettingsFormPage>
  );
}
