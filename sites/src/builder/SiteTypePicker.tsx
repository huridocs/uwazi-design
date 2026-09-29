/* Whole site › Site type: the eight types drawn on this collection. Pointing
 * at one (hover, focus, arrow keys) previews it in the main preview; nothing
 * changes until Apply in the bar above the preview. */
import { useRef } from "react";
import type { TemplateId } from "../model/config";
import { SITE_TYPES, type CollectionProfile } from "../model/templates";
import { Schematic } from "./FirstRun";

export function SiteTypePicker({ current, previewing, prof, onPreview }: { current: TemplateId; previewing?: TemplateId; prof?: CollectionProfile; onPreview: (t: TemplateId) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  if (!prof) return <p className="text-xs text-ink-tertiary">Reading the collection…</p>;
  const shown = previewing ?? current;
  const move = (i: number, e: React.KeyboardEvent) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: 2, ArrowUp: -2 }[e.key];
    if (!step) return;
    e.preventDefault();
    const n = (i + step + SITE_TYPES.length) % SITE_TYPES.length;
    refs.current[n]?.focus();
  };
  return (
    <>
      <p className="text-xs text-ink-secondary">Point at a type to preview it on this site. Your edits, languages, logo and pages you added come along.</p>
      <ul className="grid grid-cols-2 gap-2" aria-label="Site types">
        {SITE_TYPES.map((s, i) => {
          const on = shown === s.id;
          const isCurrent = current === s.id;
          return (
            <li key={s.id}>
              <button
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                aria-pressed={on}
                aria-describedby={`st-${s.id}`}
                onPointerEnter={(e) => e.pointerType === "mouse" && onPreview(s.id)}
                onFocus={() => onPreview(s.id)}
                onClick={() => onPreview(s.id)}
                onKeyDown={(e) => move(i, e)}
                className={`w-full flex flex-col gap-1.5 p-1.5 rounded-lg text-start ${on ? "bg-parchment" : "hover:bg-warm"}`}
              >
                <Schematic type={s.id} accent={s.accent} prof={prof} className="h-24" />
                <span className="flex items-baseline gap-1.5 px-0.5">
                  <span className="text-sm text-ink">{s.label}</span>
                  {isCurrent ? <span className="text-[0.6875rem] text-ink-tertiary">current</span> : null}
                  {!s.fits(prof) ? (
                    <span className="ms-auto inline-flex items-center gap-1 text-[0.6875rem] text-ink-tertiary" title={s.needs}>
                      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-warning" /> needs data
                    </span>
                  ) : null}
                </span>
                <span id={`st-${s.id}`} className="sr-only">
                  {s.description} {s.needs}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
