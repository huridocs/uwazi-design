import { ProgressBar } from "../shared/ProgressBar";
import type { LanguageProgress } from "../../atoms/translations";

const pct = (p: LanguageProgress) => (p.total ? Math.round((p.done / p.total) * 100) : 100);

/** Per-language translation progress (UX8). Translators work through gaps,
 *  so each target language says how far it is.
 *
 *  - `strip`: one cell per language with its bar and "8 of 10", for an
 *    editor's head. A language is a button when `onPick` is given: it
 *    filters to that language's untranslated keys; `active` marks it.
 *  - `compact`: "ES 80%" per language on one line, for a list row. */
export function TranslationProgress({
  progress,
  variant = "strip",
  active,
  onPick,
}: {
  progress: LanguageProgress[];
  variant?: "strip" | "compact";
  active?: string;
  onPick?: (key: string) => void;
}) {
  if (variant === "compact")
    return (
      <span data-component="TranslationProgress" data-variant="compact" className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-meta tabular-nums">
        {progress.map((p) => (
          <span key={p.key} className={pct(p) === 100 ? "text-ink-tertiary" : "text-ink-secondary"}>
            <abbr title={p.label} className="no-underline font-semibold uppercase">
              {p.key}
            </abbr>{" "}
            {pct(p)}%
          </span>
        ))}
      </span>
    );
  return (
    <ul data-component="TranslationProgress" aria-label="Translated per language" className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
      {progress.map((p) => {
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-ink truncate">{p.label}</span>
              <span className="text-meta text-ink-tertiary tabular-nums whitespace-nowrap">
                {p.done.toLocaleString()} of {p.total.toLocaleString()}
              </span>
            </span>
            <ProgressBar value={pct(p)} color={pct(p) === 100 ? "green" : "blue"} ariaLabel={`${p.label} translated`} />
          </>
        );
        const ground = active === p.key ? "bg-parchment" : "bg-warm";
        return (
          <li key={p.key}>
            {onPick ? (
              <button
                type="button"
                aria-pressed={active === p.key}
                onClick={() => onPick(p.key)}
                className={`w-full flex flex-col gap-1.5 px-2.5 py-2 rounded-md text-start ${ground} hover:bg-parchment cursor-pointer
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/50`}
              >
                {body}
              </button>
            ) : (
              <div className={`flex flex-col gap-1.5 px-2.5 py-2 rounded-md ${ground}`}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
