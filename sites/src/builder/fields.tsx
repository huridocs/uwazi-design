/* Form fields for block props and site settings. Every text field edits the
 * language chosen in the top bar and marks text that isn't translated yet. */
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Search, Trash2, X } from "lucide-react";
import type { DataSource, Entity, Template, Thesaurus } from "../data/types";
import type { ImageRef, L10n, Lang, SiteConfig, StatItem } from "../model/config";
import { LANG_NAMES, missing, newId } from "../model/config";
import { IconButton, Label, Select, inputCls } from "./ui";

export interface BuilderCtx {
  config: SiteConfig;
  lang: Lang;
  templates: Template[];
  thesauri: Thesaurus[];
  ds: DataSource;
}
const Ctx = createContext<BuilderCtx | null>(null);
export const BuilderProvider = Ctx.Provider;
export function useBuilder() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useBuilder outside the builder");
  return c;
}

/** "Not translated" marker: text exists in the default language only. */
export function MissingMark({ onCopy }: { onCopy?: () => void }) {
  const { config } = useBuilder();
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-ink-tertiary">
      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-warning" />
      Not translated
      {onCopy ? (
        <button type="button" onClick={onCopy} className="text-ink-secondary underline underline-offset-2 hover:text-ink">
          Copy {config.defaultLanguage.toUpperCase()}
        </button>
      ) : null}
    </span>
  );
}

export function L10nField({ label, value, onChange, long = false, required = false, hint }: { label: string; value: L10n; onChange: (v: L10n) => void; long?: boolean; required?: boolean; hint?: string }) {
  const { config, lang } = useBuilder();
  const id = useId();
  const def = config.defaultLanguage;
  const gap = missing(value, lang, def);
  const current = value[lang] ?? "";
  const set = (s: string) => onChange({ ...value, [lang]: s });
  const empty = required && !current.trim() && !(value[def] ?? "").trim();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} aside={gap ? <MissingMark onCopy={() => set(value[def] ?? "")} /> : config.languages.length > 1 ? <span className="text-[0.6875rem] text-ink-muted">{lang.toUpperCase()}</span> : null}>
        {label}
        {required ? <span className="text-ink-muted"> · required</span> : null}
      </Label>
      {long ? (
        <textarea
          id={id}
          dir={LANG_NAMES[lang]?.rtl ? "rtl" : undefined}
          value={current}
          placeholder={gap ? value[def] : undefined}
          onChange={(e) => set(e.target.value)}
          rows={Math.min(10, Math.max(3, current.split("\n").length + 1))}
          aria-invalid={empty || undefined}
          className={`${inputCls} h-auto py-1.5 leading-relaxed resize-y ${empty ? "border-seal/60" : ""}`}
        />
      ) : (
        <input id={id} dir={LANG_NAMES[lang]?.rtl ? "rtl" : undefined} value={current} placeholder={gap ? value[def] : undefined} onChange={(e) => set(e.target.value)} aria-invalid={empty || undefined} className={`${inputCls} ${empty ? "border-seal/60" : ""}`} />
      )}
      {hint ? <p className="text-[0.6875rem] text-ink-tertiary">{hint}</p> : null}
    </div>
  );
}

export function TextField({ label, value, onChange, hint, type = "text" }: { label: string; value: string; onChange: (v: string) => void; hint?: string; type?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <input id={id} type={type} dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      {hint ? <p className="text-[0.6875rem] text-ink-tertiary">{hint}</p> : null}
    </div>
  );
}

export function NumberField({ label, value, onChange, min = 1, max = 100 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <input id={id} type="number" min={min} max={max} value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))} className={`${inputCls} w-24`} />
    </div>
  );
}

export function SelectField({ label, value, onChange, options, hint }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; hint?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={value} onChange={onChange} options={options} />
      {hint ? <p className="text-[0.6875rem] text-ink-tertiary">{hint}</p> : null}
    </div>
  );
}

export function useTemplateOptions(allowAll = true) {
  const { templates } = useBuilder();
  return [...(allowAll ? [{ value: "", label: "Every template" }] : []), ...templates.map((t) => ({ value: t.id, label: t.name }))];
}

const BUILTIN: Record<string, { label: string; kind: "dates" | "values" }> = {
  year: { label: "Year", kind: "dates" },
  decade: { label: "Decade", kind: "dates" },
  country: { label: "Country", kind: "values" },
  status: { label: "Status", kind: "values" },
  template: { label: "Template", kind: "values" },
};

export function useKeyOptions(template: string | undefined, kinds: ("dates" | "values" | "all")[] = ["values"]) {
  const { templates } = useBuilder();
  return useMemo(() => {
    const all = kinds.includes("all");
    const out: { value: string; label: string }[] = [];
    for (const [k, v] of Object.entries(BUILTIN)) if (all || kinds.includes(v.kind)) out.push({ value: k, label: v.label });
    if (all) out.push({ value: "date", label: "Date" });
    const tpls = template ? templates.filter((t) => t.id === template) : templates;
    const seen = new Set(out.map((o) => o.value));
    for (const t of tpls)
      for (const p of t.properties) {
        if (seen.has(p.name)) continue;
        if (!all && !kinds.includes("values")) continue;
        if (!all && !["select", "multiselect", "text", "relationship"].includes(p.type)) continue;
        seen.add(p.name);
        out.push({ value: p.name, label: p.label });
      }
    return out;
  }, [templates, template, kinds.join()]);
}

export function KeysField({ label, value, onChange, template, kinds }: { label: string; value: string[]; onChange: (v: string[]) => void; template?: string; kinds?: ("dates" | "values" | "all")[] }) {
  const opts = useKeyOptions(template, kinds);
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-medium text-ink-secondary mb-1.5">{label}</legend>
      <div id={id} className="flex flex-wrap gap-1.5">
        {opts.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
              className={`h-7 px-2.5 rounded-md text-xs border transition-colors ${on ? "bg-parchment border-ink/25 text-ink" : "bg-paper border-border-soft text-ink-tertiary hover:text-ink"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ── Records chosen by hand ───────────────────────────────────────────── */

export function EntitiesField({ label, value, onChange, template }: { label: string; value: string[]; onChange: (v: string[]) => void; template?: string }) {
  const { ds } = useBuilder();
  const [chosen, setChosen] = useState<Entity[]>([]);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Entity[]>([]);
  const id = useId();
  useEffect(() => {
    let alive = true;
    ds.entities(value).then((r) => alive && setChosen(r));
    return () => {
      alive = false;
    };
  }, [ds, value.join()]);
  useEffect(() => {
    let alive = true;
    if (!q.trim()) {
      setFound([]);
      return;
    }
    const t = setTimeout(() => ds.search({ text: q, template, sort: "connected", limit: 8 }).then((r) => alive && setFound(r.rows.filter((e) => !value.includes(e.id)))), 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [ds, q, template, value.join()]);
  const move = (i: number, d: number) => {
    const n = [...value];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    onChange(n);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {chosen.length ? (
        <ol className="flex flex-col rounded-md border border-border-soft divide-y divide-border overflow-hidden">
          {value.map((vid, i) => {
            const e = chosen.find((x) => x.id === vid);
            return (
              <li key={vid} className="flex items-center gap-1 ps-2.5 pe-1 h-9 bg-paper">
                <span className="flex-1 min-w-0 truncate text-sm text-ink">{e?.title ?? vid}</span>
                <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp size={13} />
                </IconButton>
                <IconButton label="Move down" disabled={i === value.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown size={13} />
                </IconButton>
                <IconButton label={`Remove ${e?.title ?? vid}`} onClick={() => onChange(value.filter((x) => x !== vid))}>
                  <X size={13} />
                </IconButton>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-xs text-ink-tertiary">None chosen yet.</p>
      )}
      <div className="relative">
        <Search size={14} aria-hidden className="absolute start-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a record to add" className={`${inputCls} ps-8`} />
      </div>
      {found.length ? (
        <ul className="flex flex-col rounded-md border border-border-soft bg-paper shadow-[var(--shadow-md)] overflow-hidden" role="listbox" aria-label="Matching records">
          {found.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...value, e.id]);
                  setQ("");
                }}
                className="w-full text-start flex items-center gap-2 px-2.5 h-9 text-sm text-ink hover:bg-warm"
              >
                <Plus size={13} aria-hidden className="text-ink-muted shrink-0" />
                <span className="truncate">{e.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function StatsField({ value, onChange }: { value: StatItem[]; onChange: (v: StatItem[]) => void }) {
  const opts = useTemplateOptions();
  const set = (i: number, patch: Partial<StatItem>) => onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-ink-secondary">Numbers</span>
      {value.map((s, i) => (
        <div key={s.id} className="flex flex-col gap-2 rounded-md border border-border-soft p-2.5 bg-warm">
          <L10nField label={`Number ${i + 1} · label`} value={s.label} onChange={(label) => set(i, { label })} />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <SelectField label="Counts" value={s.template ?? ""} onChange={(v) => set(i, { template: v || undefined })} options={opts} />
            </div>
            <IconButton label={`Remove number ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="mb-0.5">
              <Trash2 size={14} />
            </IconButton>
          </div>
        </div>
      ))}
      {value.length < 4 ? (
        <button type="button" onClick={() => onChange([...value, { id: newId("s"), label: { en: "" } }])} className="self-start inline-flex items-center gap-1 text-xs text-ink-secondary hover:text-ink">
          <Plus size={13} aria-hidden /> Add a number
        </button>
      ) : null}
    </div>
  );
}

export function LinesField({ label, value, onChange }: { label: string; value: L10n[]; onChange: (v: L10n[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-ink-secondary">{label}</span>
      {value.map((line, i) => (
        <div key={i} className="flex items-end gap-1">
          <div className="flex-1">
            <L10nField label={`${i + 1}`} value={line} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} />
          </div>
          <IconButton label={`Remove ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="mb-0.5">
            <Trash2 size={14} />
          </IconButton>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, {}])} className="self-start inline-flex items-center gap-1 text-xs text-ink-secondary hover:text-ink">
        <Plus size={13} aria-hidden /> Add
      </button>
    </div>
  );
}

/* ── Pictures: upload, focal point, alt text (required) ───────────────── */

function readImage(file: File): Promise<{ src: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => {
      const src = String(r.result);
      const img = new Image();
      img.onload = () => {
        // Keep the stored copy small: the config is one JSON document.
        const max = 1600;
        const s = Math.min(1, max / Math.max(img.width, img.height));
        if (s === 1 && src.length < 600_000) return resolve({ src, width: img.width, height: img.height });
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        resolve({ src: c.toDataURL("image/jpeg", 0.82), width: c.width, height: c.height });
      };
      img.onerror = () => reject(new Error("Not an image"));
      img.src = src;
    };
    r.readAsDataURL(file);
  });
}

export function ImageField({ label, value, onChange }: { label: string; value?: ImageRef; onChange: (v?: ImageRef) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const { lang, config } = useBuilder();
  const pick = async (f?: File) => {
    if (!f) return;
    setError(undefined);
    setBusy(true);
    try {
      const img = await readImage(f);
      onChange({ src: img.src, width: img.width, height: img.height, focal: { x: 0.5, y: 0.5 }, alt: value?.alt ?? {} });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const noAlt = !!value && !(value.alt[lang] ?? value.alt[config.defaultLanguage] ?? "").trim();
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-ink-secondary">{label}</span>
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
      {value ? (
        <>
          <FocalPicker image={value} onChange={(focal) => onChange({ ...value, focal })} />
          <L10nField label="Alt text" required value={value.alt} onChange={(alt) => onChange({ ...value, alt })} hint={noAlt ? "Describe the picture for people who can't see it. Publishing waits for this." : "What the picture shows, in a sentence."} />
          <div className="flex gap-2">
            <button type="button" onClick={() => input.current?.click()} className="text-xs text-ink-secondary hover:text-ink underline underline-offset-2">
              Replace
            </button>
            <button type="button" onClick={() => onChange(undefined)} className="text-xs text-seal-label hover:underline underline-offset-2">
              Remove
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
          className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-md border border-dashed border-border-soft bg-warm text-xs text-ink-tertiary hover:text-ink hover:border-ink/30"
        >
          <ImagePlus size={18} aria-hidden />
          {busy ? "Reading…" : "Upload or drop a picture"}
        </button>
      )}
      {error ? (
        <p role="alert" className="text-xs text-seal-label">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Click or use the arrow keys to set what stays in frame; the two crops show
 *  the result on a wide screen and on a phone. */
function FocalPicker({ image, onChange }: { image: ImageRef; onChange: (f: { x: number; y: number }) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const set = (clientX: number, clientY: number) => {
    const r = box.current!.getBoundingClientRect();
    onChange({ x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (clientY - r.top) / r.height)) });
  };
  const pos = `${image.focal.x * 100}% ${image.focal.y * 100}%`;
  return (
    <div className="flex flex-col gap-2">
      <div
        ref={box}
        role="slider"
        tabIndex={0}
        aria-label="Focal point"
        aria-valuetext={`${Math.round(image.focal.x * 100)}% across, ${Math.round(image.focal.y * 100)}% down`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          set(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => e.buttons && set(e.clientX, e.clientY)}
        onKeyDown={(e) => {
          const d = { ArrowLeft: [-0.05, 0], ArrowRight: [0.05, 0], ArrowUp: [0, -0.05], ArrowDown: [0, 0.05] }[e.key];
          if (!d) return;
          e.preventDefault();
          onChange({ x: Math.min(1, Math.max(0, image.focal.x + d[0])), y: Math.min(1, Math.max(0, image.focal.y + d[1])) });
        }}
        className="relative rounded-md overflow-hidden bg-vellum cursor-crosshair select-none touch-none"
      >
        <img src={image.src} alt="" draggable={false} className="block w-full h-auto max-h-48 object-contain" />
        <span aria-hidden className="absolute w-5 h-5 -ms-2.5 -mt-2.5 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]" style={{ left: `${image.focal.x * 100}%`, top: `${image.focal.y * 100}%` }} />
      </div>
      <div aria-hidden className="flex gap-2 items-end">
        <span className="flex flex-col gap-1 flex-[2.4]">
          <span className="block aspect-[21/9] rounded-sm overflow-hidden bg-vellum">
            <img src={image.src} alt="" className="w-full h-full object-cover" style={{ objectPosition: pos }} />
          </span>
          <span className="text-[0.6875rem] text-ink-muted">Wide</span>
        </span>
        <span className="flex flex-col gap-1 flex-[0.6]">
          <span className="block aspect-[9/16] rounded-sm overflow-hidden bg-vellum">
            <img src={image.src} alt="" className="w-full h-full object-cover" style={{ objectPosition: pos }} />
          </span>
          <span className="text-[0.6875rem] text-ink-muted">Phone</span>
        </span>
      </div>
    </div>
  );
}

export function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>;
}
