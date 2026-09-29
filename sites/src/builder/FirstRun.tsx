/* First run: pick a collection, pick a site type, get a finished site. Two
 * choices, one button. */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { CollectionId } from "../data/types";
import type { SiteConfig, TemplateId } from "../model/config";
import { BLOCKS } from "../model/blocks";
import { SITE_TYPES, buildSite, profile, type CollectionProfile } from "../model/templates";
import { COLLECTIONS, sourceFor } from "../lib/sources";
import { Button } from "./ui";

export function FirstRun({ onCreate }: { onCreate: (c: SiteConfig) => void }) {
  const [collection, setCollection] = useState<CollectionId | null>(null);
  const [prof, setProf] = useState<CollectionProfile | null>(null);
  const [error, setError] = useState<string>();
  const [type, setType] = useState<TemplateId | null>(null);

  useEffect(() => {
    if (!collection) return;
    let alive = true;
    setProf(null);
    setError(undefined);
    profile(sourceFor(collection)).then(
      (p) => {
        if (!alive) return;
        setProf(p);
        setType((t) => t ?? SITE_TYPES.find((s) => s.fits(p))?.id ?? "research");
      },
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [collection]);

  const step = collection && (prof || error) ? 2 : 1;

  return (
    <div className="min-h-screen bg-parchment flex flex-col">
      <header className="h-12 flex items-center gap-3 px-5 border-b border-border bg-paper">
        <Mark />
        <span className="text-sm font-semibold text-ink">Site builder</span>
        <span className="text-xs text-ink-tertiary">· Uwazi</span>
      </header>
      <main className="flex-1 w-full max-w-[64rem] mx-auto px-5 py-10 flex flex-col gap-8">
        <ol aria-label="Steps" className="flex items-center gap-3 text-xs text-ink-tertiary">
          <li className={`flex items-center gap-1.5 ${step === 1 ? "text-ink font-medium" : ""}`} aria-current={step === 1 ? "step" : undefined}>
            <StepDot n={1} done={step > 1} /> Collection
          </li>
          <li aria-hidden className="w-8 h-px bg-border-soft" />
          <li className={`flex items-center gap-1.5 ${step === 2 ? "text-ink font-medium" : ""}`} aria-current={step === 2 ? "step" : undefined}>
            <StepDot n={2} done={false} /> Kind of site
          </li>
        </ol>

        {step === 1 ? (
          <section className="flex flex-col gap-5" aria-labelledby="s1">
            <div>
              <h1 id="s1" className="text-2xl font-semibold text-ink">Which collection is the site about?</h1>
              <p className="text-sm text-ink-secondary mt-1">The site shows this collection's public records, live. You can't change it later without starting again.</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-3">
              {COLLECTIONS.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setCollection(c.id)}
                    aria-busy={collection === c.id}
                    className="w-full h-full text-start flex flex-col gap-2 rounded-lg border border-border-soft bg-paper p-4 hover:border-ink/30 hover:shadow-[var(--shadow-md)] transition-shadow disabled:opacity-60"
                    disabled={!!collection && collection !== c.id}
                  >
                    <span className="text-base font-semibold text-ink">{c.name}</span>
                    <span className="text-sm text-ink-tertiary">{c.blurb}</span>
                    {collection === c.id ? <span className="text-xs text-ink-tertiary mt-auto" role="status">Reading the collection…</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="flex flex-col gap-5" aria-labelledby="s2">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h1 id="s2" className="text-2xl font-semibold text-ink">What kind of site?</h1>
                <p className="text-sm text-ink-secondary mt-1">
                  Each one opens finished, filled with {prof?.info.name ?? "the collection"}'s records. Everything in it can be changed.
                </p>
              </div>
              <Button
                variant="ghost"
                icon={<ArrowLeft size={14} className="rtl:rotate-180" />}
                onClick={() => {
                  setCollection(null);
                  setProf(null);
                  setType(null);
                }}
              >
                Collection
              </Button>
            </div>
            {error ? (
              <p role="alert" className="rounded-md bg-seal-tint px-4 py-3 text-sm text-ink">
                The collection couldn't be read: {error}
              </p>
            ) : null}
            {prof ? (
              <div role="radiogroup" aria-label="Kind of site" className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {SITE_TYPES.map((s) => {
                  const on = type === s.id;
                  const fits = s.fits(prof);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setType(s.id)}
                      onDoubleClick={() => onCreate(buildSite(s.id, prof))}
                      className={`text-start flex flex-col gap-2 rounded-lg border p-2.5 transition-colors ${on ? "bg-parchment border-ink/30" : "bg-paper border-border-soft hover:border-ink/20"}`}
                    >
                      <Schematic type={s.id} accent={s.accent} prof={prof} />
                      <span className="px-1 flex flex-col gap-0.5 pb-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink">{s.label}</span>
                          {!fits ? <span className="text-[0.6875rem] text-ink-tertiary">· needs more data</span> : null}
                        </span>
                        <span className="text-xs text-ink-tertiary">{s.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            {/* The readback line is always mounted; it names the choice and what it needs. */}
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5 min-h-[3.5rem]">
              <p className="text-sm text-ink-secondary flex-1 min-w-[14rem]" aria-live="polite">
                {type && prof ? (
                  <>
                    <span className="text-ink font-medium">{SITE_TYPES.find((s) => s.id === type)!.label}</span> on {prof.info.name}. {SITE_TYPES.find((s) => s.id === type)!.needs}
                  </>
                ) : null}
              </p>
              <Button variant="primary" disabled={!type || !prof} onClick={() => type && prof && onCreate(buildSite(type, prof))} icon={null}>
                Create site <ArrowRight size={14} aria-hidden className="rtl:rotate-180" />
              </Button>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function StepDot({ n, done }: { n: number; done: boolean }) {
  return <span className={`w-5 h-5 rounded-full grid place-items-center text-[0.6875rem] ${done ? "bg-ink text-paper" : "bg-paper border border-border-soft text-ink-secondary"}`}>{done ? <Check size={11} aria-hidden /> : n}</span>;
}

export function Mark() {
  return (
    <span aria-hidden className="flex flex-col gap-[2px]">
      <span className="w-2 h-2 rounded-[1px] bg-seal" />
      <span className="w-2 h-2 rounded-[1px] bg-carbon" />
    </span>
  );
}

/** A site type's home page as silhouettes, one bar per block, in order. */
const SIL: Partial<Record<string, string>> = {
  hero: "h-6",
  search: "h-2",
  facets: "h-2.5",
  stats: "h-4",
  statusBar: "h-2",
  entityList: "h-7",
  featured: "h-6",
  topics: "h-5",
  map: "h-7",
  chart: "h-5",
  timeline: "h-3",
  index: "h-8",
  gallery: "h-10",
  collections: "h-5",
  table: "h-6",
  text: "h-4",
  quote: "h-3",
  asks: "h-3",
  cta: "h-3",
  share: "h-1.5",
};
export function Schematic({ type, accent, prof, className = "h-36" }: { type: TemplateId; accent: string; prof: CollectionProfile; className?: string }) {
  const home = useMemo(() => buildSite(type, prof).pages.find((p) => p.kind === "home")!.blocks, [type, prof]);
  return (
    <span aria-hidden className={`flex flex-col gap-1 p-2 ${className} rounded-md bg-paper border border-border overflow-hidden`}>
      <span className="flex items-center gap-1 mb-0.5">
        <span className="w-2 h-2 rounded-[2px]" style={{ background: accent }} />
        <span className="h-1 w-10 rounded-full bg-border-soft" />
        <span className="ms-auto h-1 w-6 rounded-full bg-border" />
      </span>
      {home.slice(0, 7).map((b, i) => (
        <span
          key={i}
          title={BLOCKS[b.type].label}
          className={`${SIL[b.type] ?? "h-2"} shrink-0 rounded-[2px] ${b.type === "hero" || b.type === "statusBar" ? "" : "bg-vellum"}`}
          style={b.type === "hero" ? { background: `color-mix(in srgb, ${accent} 20%, transparent)` } : b.type === "statusBar" ? { background: `linear-gradient(90deg, var(--warning) 0 45%, var(--accent-blue) 45% 70%, var(--success) 70%)`, opacity: 0.6 } : undefined}
        />
      ))}
    </span>
  );
}
