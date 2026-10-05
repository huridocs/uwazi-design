import { useState } from "react";
import { LayoutTemplate } from "lucide-react";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "../../../shared/Modal";
import { SITE_LANGS, SITE_TEMPLATES, templateDoc, type BlockType, type SiteLang, type SiteTemplateId } from "../../../../data/sitePages";
import { PAGE_STATUS_LABEL, type PageStatus } from "../../../../atoms/sitePages";

/** Where a page stands, in the words the Pages list uses. The line is always
 *  mounted, so a change of state swaps its words and moves nothing. */
export function StatusLine({ state, unsaved }: { state: PageStatus; unsaved: boolean }) {
  return (
    <div data-component="PageStatusLine" className="flex items-center gap-2 h-6 min-w-0" aria-live="polite">
      <PageStatusPill status={state} />
      <span className={`text-meta text-ink-tertiary truncate ${unsaved ? "" : "invisible"}`}>Unsaved edits</span>
    </div>
  );
}

export function PageStatusPill({ status }: { status: PageStatus }) {
  const cls = status === "published" ? "text-success bg-success-light" : status === "edited" ? "text-ink-secondary bg-warning-light" : "text-ink-secondary bg-warm";
  return (
    <span data-part="status" className={`text-meta font-semibold px-2 py-0.5 rounded-md w-fit whitespace-nowrap ${cls}`}>
      {PAGE_STATUS_LABEL[status]}
    </span>
  );
}

/** Language switch for the page being edited. A dot marks the languages that
 *  have content, so an empty translation is visible before it is opened. */
export function LangSwitch({
  value,
  onChange,
  filled,
  label = "Page language",
}: {
  value: SiteLang;
  onChange: (l: SiteLang) => void;
  filled: (l: SiteLang) => boolean;
  label?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-md border border-border overflow-hidden shrink-0"
      onKeyDown={(e) => {
        // One tab stop; arrows move the choice (reading direction for left/right).
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const rtl = getComputedStyle(e.currentTarget).direction === "rtl" && (e.key === "ArrowLeft" || e.key === "ArrowRight");
        const i = SITE_LANGS.findIndex((l) => l.key === value);
        const next = SITE_LANGS[(i + (rtl ? -step : step) + SITE_LANGS.length) % SITE_LANGS.length];
        onChange(next.key);
        (e.currentTarget.querySelector(`[data-lang="${next.key}"]`) as HTMLElement | null)?.focus();
      }}
    >
      {SITE_LANGS.map((l, i) => (
        <button
          key={l.key}
          type="button"
          role="radio"
          data-lang={l.key}
          aria-checked={value === l.key}
          tabIndex={value === l.key ? 0 : -1}
          onClick={() => onChange(l.key)}
          title={l.label + (filled(l.key) ? "" : " · empty")}
          className={`relative h-7 px-2.5 text-xs font-medium transition-colors cursor-pointer ${i ? "border-s border-border" : ""} ${
            value === l.key ? "bg-vellum text-ink" : "bg-paper text-ink-tertiary hover:text-ink-secondary"
          }`}
        >
          {l.key.toUpperCase()}
          <span
            aria-hidden
            className={`absolute top-1 end-1 w-1 h-1 rounded-full ${filled(l.key) ? "bg-ink-tertiary" : "bg-transparent"}`}
          />
          <span className="sr-only">{filled(l.key) ? "" : " (empty)"}</span>
        </button>
      ))}
    </div>
  );
}

/** Starter templates for a new page — the same four in both directions. */
export function TemplatePickerModal({
  title = "New page",
  commitLabel = "Create page",
  onPick,
  onClose,
}: {
  title?: string;
  commitLabel?: string;
  onPick: (id: SiteTemplateId) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<SiteTemplateId>("legal");
  const pickedMeta = SITE_TEMPLATES.find((t) => t.id === picked)!;
  return (
    <Modal
      onClose={onClose}
      title={title}
      subtitle="Start from a site type. It opens as code you can change; everything uses components Uwazi has today."
      size="xl"
      component="TemplatePickerModal"
      footer={
        <>
          <button type="button" className={`${MODAL_BUTTON} text-ink-secondary hover:bg-warm`} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={picked ? MODAL_COMMIT : MODAL_COMMIT_DISABLED} onClick={() => onPick(picked)}>
            {commitLabel}
          </button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Site type" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SITE_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={picked === t.id}
            onClick={() => setPicked(t.id)}
            onDoubleClick={() => onPick(t.id)}
            className={`flex flex-col gap-2 text-start p-2 rounded-md border transition-colors cursor-pointer
              focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40 ${
                picked === t.id ? "bg-parchment border-ink/30" : "bg-paper border-border hover:bg-warm"
              }`}
          >
            <Schematic id={t.id} accent={t.theme.accent} />
            <span className="flex flex-col gap-0.5 min-w-0 px-0.5 pb-0.5">
              <span className="text-sm font-medium text-ink">{t.label}</span>
              <span className="text-meta text-ink-tertiary line-clamp-2">{t.description}</span>
            </span>
          </button>
        ))}
      </div>
      {/* The picked type in full: the cards clamp their descriptions. */}
      <div className="mt-3 flex items-start gap-1.5 min-h-[2.5rem] text-xs" aria-live="polite">
        <LayoutTemplate size={13} aria-hidden className="mt-0.5 shrink-0 text-ink-tertiary" />
        <p className="text-ink-secondary">
          <span className="font-medium text-ink">{pickedMeta.label}.</span> {pickedMeta.description}{" "}
          <span className="text-ink-tertiary">{pickedMeta.needs ?? "Filled with real entities from this collection."}</span>
        </p>
      </div>
    </Modal>
  );
}

/** Pick one language to copy from into another. */
export function CopyFromLanguageModal({
  target,
  languages,
  filled,
  onCopy,
  onClose,
}: {
  target: string;
  /** The installed languages, by key, with the name to show. */
  languages: { key: string; label: string }[];
  filled: (l: string) => boolean;
  onCopy: (from: string) => void;
  onClose: () => void;
}) {
  const sources = languages.filter((l) => l.key !== target && filled(l.key));
  const [from, setFrom] = useState<string | null>(sources[0]?.key ?? null);
  const targetLabel = languages.find((l) => l.key === target)?.label ?? target;
  return (
    <Modal
      onClose={onClose}
      title={`Copy into ${targetLabel}`}
      size="sm"
      component="CopyFromLanguageModal"
      footer={
        <>
          <button type="button" className={`${MODAL_BUTTON} text-ink-secondary hover:bg-warm`} onClick={onClose}>
            Cancel
          </button>
          <button type="button" disabled={!from} className={from ? MODAL_COMMIT : MODAL_COMMIT_DISABLED} onClick={() => from && onCopy(from)}>
            Copy
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-secondary mb-3">
        {filled(target)
          ? `Replaces the ${targetLabel} content with a copy you then translate. The ${targetLabel} draft you have now is lost.`
          : `Starts the ${targetLabel} page from a copy you then translate, instead of an empty editor.`}
      </p>
      {sources.length ? (
        <div role="radiogroup" aria-label="Copy from" className="flex flex-col gap-1">
          {sources.map((l) => (
            <label key={l.key} className={`flex items-center gap-2 px-2 h-8 rounded-md cursor-pointer ${from === l.key ? "bg-parchment" : "hover:bg-warm"}`}>
              <input type="radio" name="copy-from" checked={from === l.key} onChange={() => setFrom(l.key)} className="accent-ink" />
              <span className="text-sm text-ink">{l.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-tertiary">No other language has content yet.</p>
      )}
    </Modal>
  );
}

/** A site type's home page as silhouettes — one bar per block, in order. The
 *  picker's static preview: it draws the arrangement, not the data. */
const SIL: Partial<Record<BlockType, string>> = {
  hero: "h-5", search: "h-2", filters: "h-1.5", stats: "h-3", statusBar: "h-2", entityList: "h-6", map: "h-6",
  chart: "h-4", timeline: "h-3", index: "h-6", collections: "h-4", featured: "h-5", imageGrid: "h-8", text: "h-4",
  quote: "h-3", cta: "h-3", contact: "h-3", share: "h-1.5",
};
function Schematic({ id, accent }: { id: SiteTemplateId; accent: string }) {
  const blocks = templateDoc(id, { main: "", topMain: [], withImages: [], mentions: null }).home;
  return (
    <span aria-hidden className="flex flex-col gap-1 p-2 h-28 rounded-[4px] bg-paper border border-border overflow-hidden">
      <span className="flex items-center gap-1 mb-0.5">
        <span className="w-2 h-2 rounded-[2px]" style={{ background: accent }} />
        <span className="h-1 w-8 rounded-full bg-border" />
      </span>
      {blocks.slice(0, 7).map((b, i) => (
        <span
          key={i}
          className={`${SIL[b.type] ?? "h-2"} shrink-0 rounded-[2px] ${b.type === "hero" ? "" : "bg-vellum"}`}
          style={b.type === "hero" ? { background: `color-mix(in srgb, ${accent} 22%, transparent)` } : undefined}
        />
      ))}
    </span>
  );
}
