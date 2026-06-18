import { useState } from "react";
import { useSetAtom } from "jotai";
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

  const dirty = css !== SAMPLE_CSS || js !== SAMPLE_JS;

  const save = () =>
    setToasts((p) => [...p, { id: Date.now().toString(), message: "Customisation saved", type: "success" as const }]);

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
        <textarea
          value={lang === "css" ? css : js}
          onChange={(e) => (lang === "css" ? setCss(e.target.value) : setJs(e.target.value))}
          spellCheck={false}
          dir="ltr"
          className="flex-1 min-h-[20rem] w-full p-4 text-sm font-mono text-ink bg-warm border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-carbon/20"
        />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="success" size="sm" disabled={!dirty} onClick={save}>
          Save
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
