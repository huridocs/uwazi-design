import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSetAtom } from "jotai";
import { Lightbulb } from "lucide-react";
import { libraryQueryAtom } from "../../atoms/library";

const PANEL_ID = "library-search-tips";
const PANEL_WIDTH = 364; // ~22.75rem

/** The five operator tips, copied (shortened) from real Uwazi's
 *  `SearchTipsContent.tsx`. Each row is: a mono `chip` (the operator), a mono
 *  `example` (concrete usage — clickable to drop into the search box), and a
 *  plain-language `prose` outcome.
 *
 *  GUIDANCE — the Library filter matches literal tokens (quoted phrases as
 *  units); it doesn't parse `*`/`?`/`~N` yet (a named follow-up), so clicking an
 *  example is a "try this shape" affordance, not a promise the operator runs. */
const TIPS: { chip: string; example: string; prose: string }[] = [
  { chip: "*", example: "juris*", prose: "matches jurisdiction, jurists, jurisprudence…" },
  { chip: "?", example: "198?", prose: "one character — matches 1980–1989, 198a…" },
  { chip: '"…"', example: '"Costa Rica"', prose: "the words together, in that order" },
  { chip: "~N", example: '"the status"~5', prose: "the two words within N of each other" },
  { chip: "AND·OR·NOT", example: "status AND women NOT Nicaragua", prose: "combine or exclude terms" },
];

/** A small tag-style "tips" chip that sits inside the Library search box (after
 *  the clear button). Clicking opens the operator tips as a popover anchored
 *  below the chip, PORTALLED to `body` so the overflow-hidden toolbar can't clip
 *  it. Escape and outside-click close it; the chip is keyboard-focusable and the
 *  panel is `aria-controls`-linked.
 *
 *  Each tip row is a button: clicking drops its example into the search box
 *  (which live-runs the search) and closes the popover. */
export function SearchTipsPopover() {
  const [open, setOpen] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const setQuery = useSetAtom(libraryQueryAtom);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = chipRef.current?.getBoundingClientRect();
      if (!r) return;
      // END-align: the panel's RIGHT edge sits at the chip's right edge, so it
      // grows leftward toward the search box — never rightward over the toolbar
      // controls. Viewport-clamped on both edges so it's never clipped.
      const left = Math.max(8, Math.min(r.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8));
      const top = Math.min(r.bottom + 6, window.innerHeight - 8);
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        chipRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!chipRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const insert = (example: string) => {
    setQuery(example);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={chipRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        className="shrink-0 inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium
          text-ink-tertiary bg-warm hover:bg-parchment hover:text-ink-secondary transition-colors
          cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
      >
        <Lightbulb size={11} aria-hidden="true" />
        tips
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            id={PANEL_ID}
            role="dialog"
            aria-label="Search tips"
            className="fixed z-50 rounded-lg border border-border bg-paper p-2 shadow-lg animate-fade-in-up"
            style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
          >
            {/* Header — frames the list and names the intent. */}
            <div className="flex items-center gap-1.5 px-2 pt-1 pb-2 mb-1 border-b border-border-soft">
              <Lightbulb size={12} className="text-ink-tertiary" aria-hidden="true" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
                Narrow your search
              </span>
            </div>

            <ul className="flex flex-col">
              {TIPS.map((tip) => (
                <li key={tip.chip}>
                  <button
                    type="button"
                    onClick={() => insert(tip.example)}
                    aria-label={`Search: ${tip.example}`}
                    className="group grid w-full grid-cols-[5.5rem_1fr] items-baseline gap-x-3 rounded-md
                      px-2 py-1.5 text-left hover:bg-parchment transition-colors cursor-pointer
                      focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
                  >
                    {/* Chip — fixed start column, aligned to the description
                        gutter (inline-end) so every description begins at the
                        same x. `dir=ltr` keeps operators readable under RTL. */}
                    <span
                      dir="ltr"
                      className="justify-self-end whitespace-nowrap rounded-[3px] border border-border-soft
                        bg-warm px-1.5 py-0.5 font-mono text-[11px] leading-none text-ink"
                    >
                      {tip.chip}
                    </span>
                    {/* Description — the example (mono, ink) reads as the thing
                        you'd type; the prose (regular, secondary) explains it.
                        Wrapped lines hang under the example, never the chip. */}
                    <span className="min-w-0 text-[11px] leading-snug">
                      <span dir="ltr" className="font-mono text-ink group-hover:text-ink">
                        {tip.example}
                      </span>{" "}
                      <span className="text-ink-secondary">{tip.prose}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
