import { useId, useState } from "react";
import { Lightbulb } from "lucide-react";

/** The five operator tips, copied (shortened) from real Uwazi's
 *  `SearchTipsContent.tsx`. These are GUIDANCE — v1's filter is substring, so
 *  the operators aren't parsed yet (a named follow-up). */
const TIPS: { glyph: string; says: string }[] = [
  { glyph: "*", says: "Wildcard — juris* matches jurisdiction, jurists, jurisprudence…" },
  { glyph: "?", says: "Single character — 198? matches 1980–1989, 198a…" },
  { glyph: '"…"', says: 'Exact phrase — "Costa Rica" differs from Costa Rica' },
  { glyph: "~N", says: 'Proximity — "the status"~5 finds the two words within 5' },
  { glyph: "AND OR NOT", says: "Booleans — status AND women NOT Nicaragua" },
];

/** A disclosure (NOT a modal — a side drawer shouldn't throw a centered modal).
 *  The trigger is right-aligned; the panel opens inline below. Local open state. */
export function SearchTipsDisclosure() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="flex min-w-0 flex-1 flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center gap-1 text-xs text-ink-tertiary hover:text-ink-secondary
          transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1
          focus-visible:ring-inset focus-visible:ring-ink/20 rounded-sm"
      >
        <Lightbulb size={12} aria-hidden="true" />
        Search tips
      </button>

      {open && (
        <div
          id={panelId}
          className="w-full rounded-md border border-border/40 bg-paper p-3 animate-fade-in-up"
        >
          <ul className="flex flex-col gap-1.5 text-xs text-ink-secondary">
            {TIPS.map((tip) => (
              <li key={tip.glyph} className="flex items-start gap-2">
                <span className="shrink-0 font-mono text-ink bg-warm px-1 rounded-[2px]">
                  {tip.glyph}
                </span>
                <span className="min-w-0">{tip.says}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
