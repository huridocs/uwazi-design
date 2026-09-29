/* Export to Uwazi: the site as code for today's page editor, one box per place
 * it goes, with the steps and what doesn't survive the trip. */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { LANG_NAMES } from "../model/config";
import { checklist, exportSite } from "../export/uwazi";
import { useBuilder } from "./fields";
import { Button, Modal, Segmented, Select } from "./ui";

function useCopy() {
  const [done, setDone] = useState<string>();
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(undefined), 1600);
    return () => clearTimeout(t);
  }, [done]);
  return {
    done,
    copy: (key: string, text: string) => {
      navigator.clipboard?.writeText(text).catch(() => {});
      setDone(key);
    },
  };
}

function CodeBox({ id, label, where, code, empty, note, copier }: { id: string; label: string; where: string; code: string; empty?: string; note?: string; copier: ReturnType<typeof useCopy> }) {
  const lines = code ? code.split("\n").length - 1 : 0;
  return (
    <section className="flex flex-col gap-1.5 min-w-0" aria-labelledby={`${id}-h`}>
      <div className="flex items-center gap-2">
        <h3 id={`${id}-h`} className="text-sm font-medium text-ink">
          {label}
        </h3>
        <span className="text-[0.6875rem] text-ink-tertiary truncate">{where}</span>
        <span className="ms-auto text-[0.6875rem] text-ink-muted tabular-nums">{code ? `${lines} lines` : ""}</span>
        <Button size="sm" variant="secondary" disabled={!code} onClick={() => copier.copy(id, code)} icon={copier.done === id ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}>
          <span aria-live="polite">{copier.done === id ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      {note ? <p className="text-[0.6875rem] text-ink-tertiary">{note}</p> : null}
      {code ? (
        <pre dir="ltr" tabIndex={0} aria-label={`${label} code`} className="max-h-56 overflow-auto rounded-md bg-warm border border-border px-3 py-2.5 text-[0.75rem] leading-relaxed font-mono text-ink-secondary whitespace-pre">
          {code}
        </pre>
      ) : (
        <p className="rounded-md border border-dashed border-border-soft px-3 py-2.5 text-xs text-ink-tertiary">{empty}</p>
      )}
    </section>
  );
}

export function ExportPanel({ onClose }: { onClose: () => void }) {
  const { config, ds, templates } = useBuilder();
  const [titles, setTitles] = useState<Map<string, string>>(new Map());
  const [pageId, setPageId] = useState(config.pages[0].id);
  const [lang, setLang] = useState(config.defaultLanguage);
  const copier = useCopy();

  // Featured records and mentions are exported with their titles.
  useEffect(() => {
    const ids = new Set<string>();
    for (const p of config.pages)
      for (const b of p.blocks) {
        const props = b.props as { ids?: string[]; body?: Record<string, string> };
        props.ids?.forEach((i) => ids.add(i));
        for (const v of Object.values(props.body ?? {})) for (const m of (v ?? "").matchAll(/@\[([\w-]+)\]/g)) ids.add(m[1]);
      }
    ds.entities([...ids]).then((rows) => setTitles(new Map(rows.map((e) => [e.id, e.title]))), () => {});
  }, [ds, config.pages]);

  const x = useMemo(() => exportSite(config, { titleOf: (id) => titles.get(id) ?? id, templates }), [config, titles, templates]);
  const page = x.pages.find((p) => p.pageId === pageId) ?? x.pages[0];
  const all = () => checklist(config, x, x.pages.map((p) => p.pageId), config.languages);

  return (
    <Modal
      title="Export to Uwazi"
      subtitle="The site as code for today's Uwazi. Lists, counts and maps stay live there; what can't come across is listed."
      onClose={onClose}
      size="xl"
      footer={
        <>
          <span className="me-auto hidden sm:inline text-xs text-ink-tertiary">Copy all gives every page and language as one checklist, in order.</span>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={() => copier.copy("all", all())} icon={copier.done === "all" ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}>
            <span aria-live="polite">{copier.done === "all" ? "Copied" : "Copy all"}</span>
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
        <aside className="flex flex-col gap-5 min-w-0">
          <section aria-labelledby="exp-steps" className="flex flex-col gap-2">
            <h3 id="exp-steps" className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">
              Steps
            </h3>
            <ol className="flex flex-col gap-2 text-sm text-ink-secondary list-decimal ps-4 marker:text-ink-muted">
              <li>
                <b className="font-medium text-ink">Settings › Customization</b> › Custom CSS: paste <i>Theme</i> at the end. Once per site.
              </li>
              <li>
                <b className="font-medium text-ink">Settings › Pages › Add page</b>, one per page. Title as shown for each language.
                {page.entityView ? " For the record page, turn on Entity view." : ""}
              </li>
              <li>
                <b className="font-medium text-ink">HTML tab</b>: pick the language in Uwazi's selector, paste that language's HTML. Repeat per language.
              </li>
              <li>
                <b className="font-medium text-ink">CSS tab</b>: paste the page CSS. It only styles this page.
              </li>
              <li>
                <b className="font-medium text-ink">JavaScript tab</b>: leave empty unless it says otherwise below.
              </li>
              <li>
                Save, then add the page to <b className="font-medium text-ink">Settings › Menu</b>.
              </li>
            </ol>
          </section>
          <section aria-labelledby="exp-warn" className="flex flex-col gap-2">
            <h3 id="exp-warn" className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">
              Won't come across as built · {x.warnings.length}
            </h3>
            {x.warnings.length ? (
              <ul className="flex flex-col gap-1.5">
                {x.warnings.map((w, i) => (
                  <li key={i} className="flex gap-2 text-xs text-ink-secondary">
                    <AlertTriangle size={12} aria-hidden className="shrink-0 mt-0.5 text-warning" />
                    <span>
                      <span className="text-ink">
                        {w.page} · {w.block}.
                      </span>{" "}
                      {w.message}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink-tertiary">Everything exports as built.</p>
            )}
          </section>
        </aside>

        <div className="flex flex-col gap-4 min-w-0">
          <CodeBox id="theme" label="Theme" where="Settings › Customization › Custom CSS" code={x.globalCss} copier={copier} />
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <label className="flex items-center gap-2 text-xs text-ink-secondary">
              Page
              <Select value={page.pageId} onChange={setPageId} options={x.pages.map((p) => ({ value: p.pageId, label: `${p.title}${p.entityView ? " (entity view)" : ""}` }))} className="w-auto" />
            </label>
            <Segmented label="Language" value={lang} onChange={setLang} options={config.languages.map((l) => ({ value: l, label: l.toUpperCase(), title: LANG_NAMES[l]?.name }))} />
            <span className="text-xs text-ink-tertiary">Title: {page.titles[lang]}</span>
          </div>
          <CodeBox id="html" label="HTML" where={`Settings › Pages › ${page.title} › HTML · ${lang.toUpperCase()}`} code={page.html[lang]} copier={copier} />
          <CodeBox id="css" label="CSS" where={`${page.title} › CSS`} code={page.css} note="Every rule starts with this page's class, so it can't restyle other pages." copier={copier} />
          <CodeBox id="js" label="JavaScript" where={`${page.title} › JavaScript`} code={page.js} note={page.jsReason} empty="No block needs JavaScript. Leave this tab empty." copier={copier} />
        </div>
      </div>
    </Modal>
  );
}
