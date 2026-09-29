/* Settings that belong to the whole site. Each section is closed until
 * opened; the defaults already make a finished site. */
import type { ReactNode } from "react";
import { AlertTriangle, Check } from "lucide-react";
import type { FontPair, L10n, SiteConfig, ThemeMode } from "../model/config";
import { LANG_NAMES, missing } from "../model/config";
import { FONT_PAIRS, checkTheme, fixAccent } from "../render/theme";
import { ImageField, L10nField, useBuilder } from "./fields";
import type { Editor } from "./state";
import { Button, Disclosure, Segmented } from "./ui";

const SWATCHES = ["#1E3A5F", "#0F766E", "#7C4A1E", "#9F1239", "#B45309", "#334155", "#1A1A1A", "#4C1D95"];

/** One section open at a time across Whole site, including `extra`'s; the
 * builder owns which, so the preview can mark the header or footer. */
export function SitePanel({ editor, open, onOpen, extra }: { editor: Editor; open: string | null; onOpen: (k: string | null) => void; extra?: ReactNode }) {
  const { config } = useBuilder();
  const toggle = (k: string) => onOpen(open === k ? null : k);
  const edit = (fn: (c: SiteConfig) => SiteConfig, tag?: string) => editor.edit(fn, tag);
  return (
    <div className="flex flex-col">
      <Disclosure title="Name" open={open === "name"} onToggle={() => toggle("name")}>
        <L10nField label="Site name" value={config.name} onChange={(name) => edit((c) => ({ ...c, name }), "name")} />
        <L10nField label="One line about it" long value={config.tagline} onChange={(tagline) => edit((c) => ({ ...c, tagline }), "tagline")} />
      </Disclosure>
      <Disclosure title="Theme" open={open === "theme"} onToggle={() => toggle("theme")}>
        <ThemeSection editor={editor} />
      </Disclosure>
      <Disclosure title="Languages" open={open === "langs"} onToggle={() => toggle("langs")} aside={config.languages.map((l) => l.toUpperCase()).join(" · ")}>
        <LanguagesSection editor={editor} />
      </Disclosure>
      {extra}
    </div>
  );
}

function ThemeSection({ editor }: { editor: Editor }) {
  const { config } = useBuilder();
  const theme = config.theme;
  const report = checkTheme(theme);
  const failing = report.filter((r) => !r.ok);
  const fix = failing.length ? fixAccent(theme.accent) : null;
  const set = (patch: Partial<SiteConfig["theme"]>, tag?: string) => editor.edit((c) => ({ ...c, theme: { ...c.theme, ...patch } }), tag);
  return (
    <>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-medium text-ink-secondary mb-2">Accent colour</legend>
        <div className="flex flex-wrap items-center gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={theme.accent.toLowerCase() === c.toLowerCase()}
              onClick={() => set({ accent: c })}
              className={`w-7 h-7 rounded-full ring-offset-2 ring-offset-paper ${theme.accent.toLowerCase() === c.toLowerCase() ? "ring-2 ring-ink" : "hover:ring-1 hover:ring-border-soft"}`}
              style={{ background: c }}
            />
          ))}
          <label className="relative w-7 h-7 rounded-full overflow-hidden border border-dashed border-border-soft cursor-pointer" title="Pick any colour">
            <span className="sr-only">Custom colour</span>
            <input type="color" value={theme.accent} onChange={(e) => set({ accent: e.target.value }, "accent")} className="absolute inset-0 opacity-0 cursor-pointer" />
            <span aria-hidden className="absolute inset-0 grid place-items-center text-ink-muted text-sm">+</span>
          </label>
          <span className="ms-1 text-xs text-ink-tertiary font-mono uppercase">{theme.accent}</span>
        </div>
        {/* The result line is always mounted: it changes words, not height. */}
        <div className="rounded-md bg-warm px-2.5 py-2 flex flex-col gap-1.5 min-h-[4.75rem]" aria-live="polite">
          {report.map((r) => (
            <div key={r.label} className="flex items-center gap-2 text-xs">
              {r.ok ? <Check size={13} aria-hidden className="text-success shrink-0" /> : <AlertTriangle size={13} aria-hidden className="text-warning shrink-0" />}
              <span className="text-ink-secondary flex-1">{r.label}</span>
              <span className={`tabular-nums ${r.ok ? "text-ink-tertiary" : "text-ink"}`}>{r.ratio.toFixed(1)}:1</span>
            </div>
          ))}
          {fix ? (
            <button type="button" onClick={() => set({ accent: fix })} className="self-start mt-1 inline-flex items-center gap-1.5 text-xs text-ink underline underline-offset-2">
              <span className="w-3 h-3 rounded-full" style={{ background: fix }} aria-hidden /> Use {fix.toUpperCase()}, the nearest shade that passes
            </button>
          ) : null}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-medium text-ink-secondary mb-2">Type</legend>
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Font pair">
          {(Object.keys(FONT_PAIRS) as FontPair[]).map((k) => {
            const f = FONT_PAIRS[k];
            const on = theme.fonts === k;
            return (
              <button key={k} type="button" role="radio" aria-checked={on} onClick={() => set({ fonts: k })} className={`text-start rounded-md border px-2.5 py-2 ${on ? "bg-parchment border-ink/25" : "bg-paper border-border-soft hover:bg-warm"}`}>
                <span className="block text-lg leading-tight text-ink" style={{ fontFamily: f.heading }}>
                  {f.label}
                </span>
                <span className="block text-[0.6875rem] text-ink-tertiary mt-0.5" style={{ fontFamily: f.body }}>
                  {f.sample}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-ink-secondary">Light or dark</span>
        <Segmented<ThemeMode>
          label="Light or dark"
          value={theme.mode}
          onChange={(mode) => set({ mode })}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
            { value: "auto", label: "Follow the reader", title: "Light or dark, as the reader's device is set" },
          ]}
        />
      </div>
      <ImageField label="Logo" value={theme.logo} onChange={(logo) => set({ logo })} />
    </>
  );
}

/** Every piece of site text, so a language's gaps can be counted and filled. */
export function allText(c: SiteConfig): L10n[] {
  const out: L10n[] = [c.name, c.tagline, c.footer.text, c.seo.title, c.seo.description, ...c.menu.map((m) => m.label), ...c.footer.links.map((m) => m.label)];
  const walk = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach(walk);
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length && keys.every((k) => k.length === 2 && typeof o[k] === "string")) {
      out.push(o as L10n);
      return;
    }
    keys.forEach((k) => walk(o[k]));
  };
  for (const p of c.pages) {
    out.push(p.title);
    p.blocks.forEach((b) => walk(b.props));
  }
  return out;
}

export function fillFrom(c: SiteConfig, from: string, to: string): SiteConfig {
  const fill = (v: unknown): unknown => {
    if (!v || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(fill);
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length && keys.every((k) => k.length === 2 && typeof o[k] === "string")) {
      const l = o as L10n;
      return (l[to] ?? "").trim() || !(l[from] ?? "").trim() ? l : { ...l, [to]: l[from] };
    }
    return Object.fromEntries(keys.map((k) => [k, fill(o[k])]));
  };
  return fill(c) as SiteConfig;
}

function LanguagesSection({ editor }: { editor: Editor }) {
  const { config } = useBuilder();
  const def = config.defaultLanguage;
  const texts = allText(config);
  const gaps = (l: string) => texts.filter((x) => missing(x, l, def)).length;
  const available = Object.keys(LANG_NAMES).filter((l) => !config.languages.includes(l));
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border-soft">
        {config.languages.map((l) => {
          const n = l === def ? 0 : gaps(l);
          return (
            <li key={l} className="flex items-center gap-2 px-2.5 min-h-10 text-sm">
              <span className="text-ink flex-1">
                {LANG_NAMES[l]?.name ?? l}
                {l === def ? <span className="ms-1.5 text-[0.6875rem] text-ink-tertiary">default</span> : null}
              </span>
              {l !== def ? (
                n ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-[0.6875rem] text-ink-tertiary">
                      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-warning" />
                      {n} not translated
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => editor.edit((c) => fillFrom(c, def, l))} title={`Fill every empty ${LANG_NAMES[l]?.name} text with the ${LANG_NAMES[def]?.name} text`}>
                      Copy from {def.toUpperCase()}
                    </Button>
                  </>
                ) : (
                  <span className="text-[0.6875rem] text-ink-tertiary inline-flex items-center gap-1">
                    <Check size={12} aria-hidden className="text-success" /> complete
                  </span>
                )
              ) : null}
              {l !== def ? (
                <Button size="sm" variant="ghost" onClick={() => editor.edit((c) => ({ ...c, languages: c.languages.filter((x) => x !== l) }))} aria-label={`Remove ${LANG_NAMES[l]?.name}`}>
                  Remove
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {available.length ? (
        <div className="flex flex-wrap gap-1.5">
          {available.map((l) => (
            <Button key={l} size="sm" variant="ghost" onClick={() => editor.edit((c) => ({ ...c, languages: [...c.languages, l] }))}>
              + {LANG_NAMES[l].name}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
