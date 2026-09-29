/* Whole site: menu, footer, search and sharing, custom code, export. */
import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { MenuItem, SiteConfig } from "../model/config";
import { newId, tr } from "../model/config";
import { onAccent } from "../render/theme";
import { ImageField, L10nField, TextField, useBuilder } from "./fields";
import type { Editor } from "./state";
import { Button, Disclosure, IconButton, Select, Toggle, inputCls } from "./ui";

/** Links as one line each (label → where it goes); a line opens to edit.
 * A new link opens ready to name. */
function MenuList({ items, onChange, label, listName }: { items: MenuItem[]; onChange: (m: MenuItem[]) => void; label: string; listName: string }) {
  const { config, lang } = useBuilder();
  const [editing, setEditing] = useState<string | null>(null);
  const t = (x: Parameters<typeof tr>[0]) => tr(x, lang, config.defaultLanguage);
  const pages = config.pages.filter((p) => p.kind !== "entity");
  const move = (i: number, d: number) => {
    const n = [...items];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    onChange(n);
  };
  const set = (i: number, patch: Partial<MenuItem>) => onChange(items.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const where = (m: MenuItem) => {
    const p = pages.find((q) => q.id === m.page);
    return p ? t(p.title) : (m.url ?? "").replace(/^https?:\/\//, "") || "No address";
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-ink-secondary">{label}</span>
      {items.length ? (
        <ol className="flex flex-col rounded-md border border-border-soft divide-y divide-border-soft" aria-label={listName}>
          {items.map((m, i) => {
            const open = editing === m.id;
            const name = t(m.label) || "Untitled";
            return (
              <li key={m.id} className={open ? "bg-warm" : ""}>
                <div className="flex items-center gap-1 ps-2.5 pe-1 min-h-10">
                  <button type="button" aria-expanded={open} onClick={() => setEditing(open ? null : m.id)} className="flex-1 min-w-0 self-stretch flex items-center text-start">
                    <span className="flex items-baseline gap-2 min-w-0">
                      <span className="text-sm text-ink truncate shrink-0 max-w-[55%]">{name}</span>
                      <span className="text-xs text-ink-tertiary truncate" dir={m.page ? undefined : "ltr"}>
                        <span aria-hidden className="rtl:inline-block rtl:-scale-x-100">→</span> {where(m)}
                      </span>
                    </span>
                  </button>
                  <IconButton label={`Move ${name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp size={13} />
                  </IconButton>
                  <IconButton label={`Move ${name} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown size={13} />
                  </IconButton>
                  <IconButton label={`Remove ${name}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                    <Trash2 size={13} />
                  </IconButton>
                </div>
                {open ? (
                  <div className="px-2.5 pb-3 flex flex-col gap-2.5">
                    <L10nField label="Label" value={m.label} onChange={(v) => set(i, { label: v })} />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-ink-secondary">Goes to</span>
                      <Select
                        value={m.page ?? "__url"}
                        onChange={(v) => set(i, v === "__url" ? { page: undefined, url: m.url ?? "https://" } : { page: v, url: undefined })}
                        options={[...pages.map((p) => ({ value: p.id, label: t(p.title) })), { value: "__url", label: "Another website…" }]}
                      />
                    </div>
                    {!m.page ? <TextField label="Address" value={m.url ?? ""} onChange={(v) => set(i, { url: v })} /> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="rounded-md border border-dashed border-border-soft px-3 py-2.5 text-xs text-ink-tertiary">No links.</p>
      )}
      <button
        type="button"
        onClick={() => {
          const id = newId("m");
          onChange([...items, { id, label: {}, page: pages[0]?.id }]);
          setEditing(id);
        }}
        className="self-start inline-flex items-center gap-1 text-xs text-ink-secondary hover:text-ink"
      >
        <Plus size={13} aria-hidden /> Add a link
      </button>
    </div>
  );
}

function SeoSection({ editor }: { editor: Editor }) {
  const { config, lang } = useBuilder();
  const t = (x: Parameters<typeof tr>[0]) => tr(x, lang, config.defaultLanguage);
  const set = (patch: Partial<SiteConfig["seo"]>, tag?: string) => editor.edit((c) => ({ ...c, seo: { ...c.seo, ...patch } }), tag);
  const title = t(config.seo.title) || t(config.name);
  const desc = t(config.seo.description) || t(config.tagline);
  const host = `${config.collection}.uwazi.io`;
  const img = config.seo.image;
  return (
    <>
      <L10nField label="Title in search results" value={config.seo.title} onChange={(title) => set({ title }, "seo-title")} hint="Leave empty to use the site name." max={60} />
      <L10nField label="Description" long value={config.seo.description} onChange={(description) => set({ description }, "seo-desc")} hint="Leave empty to use the line about the site." max={155} />
      <ImageField label="Picture when shared" value={img} onChange={(image) => set({ image })} />
      <section aria-label="How the site appears" className="flex flex-col gap-2">
        <span className="text-xs font-medium text-ink-secondary">In a search engine</span>
        <div className="rounded-md border border-border-soft bg-paper p-3 flex flex-col gap-0.5">
          <span className="text-[0.6875rem] text-ink-tertiary" dir="ltr">{host}</span>
          <span className="text-[0.9375rem] font-medium text-ink leading-snug line-clamp-1">{title}</span>
          <span className="text-xs text-ink-secondary line-clamp-2">{desc || "No description: search engines will pick a line from the page."}</span>
        </div>
        <span className="text-xs font-medium text-ink-secondary">When the link is shared</span>
        {img ? (
          <div className="rounded-lg border border-border-soft bg-paper overflow-hidden">
            <div className="aspect-[1.91/1] bg-vellum overflow-hidden">
              <img src={img.src} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${img.focal.x * 100}% ${img.focal.y * 100}%` }} />
            </div>
            <div className="px-3 py-2 flex flex-col gap-0.5 border-t border-border">
              <span className="text-[0.6875rem] text-ink-tertiary" dir="ltr">{host}</span>
              <span className="text-sm font-medium text-ink line-clamp-1">{title}</span>
              <span className="text-xs text-ink-tertiary line-clamp-1">{desc}</span>
            </div>
          </div>
        ) : (
          <>
            {/* Without a picture, chat apps and social sites show a small card. */}
            <div className="rounded-lg border border-border-soft bg-paper flex items-stretch overflow-hidden">
              <span aria-hidden className="w-16 shrink-0 grid place-items-center text-xl font-semibold" style={{ background: config.theme.accent, color: onAccent(config.theme.accent) }}>
                {t(config.name).trim().charAt(0)}
              </span>
              <span className="min-w-0 px-3 py-2 flex flex-col gap-0.5">
                <span className="text-[0.6875rem] text-ink-tertiary" dir="ltr">{host}</span>
                <span className="text-sm font-medium text-ink line-clamp-1">{title}</span>
                <span className="text-xs text-ink-tertiary line-clamp-1">{desc}</span>
              </span>
            </div>
            <p className="text-[0.6875rem] text-ink-tertiary">Add a picture for the large card. 1200 × 630 fits every site.</p>
          </>
        )}
      </section>
    </>
  );
}

function AdvancedSection({ editor }: { editor: Editor }) {
  const { config } = useBuilder();
  const a = config.advanced;
  const cssId = useId();
  const jsId = useId();
  const set = (patch: Partial<SiteConfig["advanced"]>, tag?: string) => editor.edit((c) => ({ ...c, advanced: { ...c.advanced, ...patch } }), tag);
  return (
    <>
      <p className="text-xs text-ink-secondary">
        Everything above makes a complete site without code. Custom code is for what the blocks can't do; it runs on the public site and in the preview, and a mistake in it can break the page.
      </p>
      <Toggle label="Use custom code" checked={a.enabled} onChange={(enabled) => set({ enabled })} />
      {a.enabled ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={cssId} className="text-xs font-medium text-ink-secondary">
              CSS
            </label>
            <textarea id={cssId} dir="ltr" spellCheck={false} value={a.css} onChange={(e) => set({ css: e.target.value }, "adv-css")} rows={6} className={`${inputCls} h-auto py-1.5 font-mono text-xs leading-relaxed`} placeholder=".site h1 { letter-spacing: -0.02em; }" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={jsId} className="text-xs font-medium text-ink-secondary">
              JavaScript
            </label>
            <textarea id={jsId} dir="ltr" spellCheck={false} value={a.js} onChange={(e) => set({ js: e.target.value }, "adv-js")} rows={6} className={`${inputCls} h-auto py-1.5 font-mono text-xs leading-relaxed`} placeholder="// Runs once when a page opens" />
            <p className="text-[0.6875rem] text-ink-tertiary">Runs once per page view. If it throws, the page still shows and the preview says why.</p>
          </div>
        </>
      ) : null}
    </>
  );
}

export function SiteSections({ editor, open, onOpen, onExport }: { editor: Editor; open: string | null; onOpen: (k: string | null) => void; onExport: () => void }) {
  const { config } = useBuilder();
  const toggle = (k: string) => onOpen(open === k ? null : k);
  return (
    <>
      <Disclosure title="Menu" open={open === "menu"} onToggle={() => toggle("menu")} aside={`${config.menu.length} links`}>
        <MenuList label="Links" listName="Menu links" items={config.menu} onChange={(menu) => editor.edit((c) => ({ ...c, menu }))} />
      </Disclosure>
      <Disclosure title="Footer" open={open === "footer"} onToggle={() => toggle("footer")}>
        <L10nField label="Footer text" value={config.footer.text} onChange={(text) => editor.edit((c) => ({ ...c, footer: { ...c.footer, text } }), "footer-text")} />
        <MenuList label="Links" listName="Footer links" items={config.footer.links} onChange={(links) => editor.edit((c) => ({ ...c, footer: { ...c.footer, links } }))} />
        <Toggle label="Say it's published with Uwazi" checked={config.footer.poweredBy} onChange={(poweredBy) => editor.edit((c) => ({ ...c, footer: { ...c.footer, poweredBy } }))} />
      </Disclosure>
      <Disclosure title="Search and sharing" open={open === "seo"} onToggle={() => toggle("seo")}>
        <SeoSection editor={editor} />
      </Disclosure>
      <Disclosure title="Advanced" open={open === "adv"} onToggle={() => toggle("adv")} aside={config.advanced.enabled ? "custom code on" : undefined}>
        <AdvancedSection editor={editor} />
      </Disclosure>
      <Disclosure title="Export to Uwazi" open={open === "export"} onToggle={() => toggle("export")}>
        <p className="text-xs text-ink-secondary">For a collection that stays on today's Uwazi: the site as code to paste into Settings › Pages, one page and language at a time, with the steps and a list of what can't come across.</p>
        <Button onClick={onExport} className="self-start">
          Open the export
        </Button>
      </Disclosure>
    </>
  );
}
