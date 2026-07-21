import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Lightbulb } from "lucide-react";

const PANEL_ID = "library-search-tips";
const PANEL_WIDTH = 352; // ~22rem

/** The five operator tips, copied (shortened) from real Uwazi's
 *  `SearchTipsContent.tsx`. GUIDANCE — the filter matches literal tokens (quoted
 *  phrases as units), it doesn't parse `*`/`?`/`~N` yet (a named follow-up). */
const TIPS: { glyph: string; says: string }[] = [
  { glyph: "*", says: "Wildcard — juris* matches jurisdiction, jurists, jurisprudence…" },
  { glyph: "?", says: "Single character — 198? matches 1980–1989, 198a…" },
  { glyph: '"…"', says: 'Exact phrase — "Costa Rica" differs from Costa Rica' },
  { glyph: "~N", says: 'Proximity — "the status"~5 finds the two words within 5' },
  { glyph: "AND OR NOT", says: "Booleans — status AND women NOT Nicaragua" },
];

/** A small tag-style "tips" chip that sits inside the Library search box (after
 *  the clear button). Clicking opens the operator tips as a popover anchored
 *  below the chip, PORTALLED to `body` so the overflow-hidden toolbar can't clip
 *  it. Escape and outside-click close it; the chip is keyboard-focusable and the
 *  panel is `aria-controls`-linked. */
export function SearchTipsPopover() {
  const [open, setOpen] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

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
            className="fixed z-50 rounded-md border border-border bg-paper p-3 shadow-lg animate-fade-in-up"
            style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
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
          </div>,
          document.body,
        )}
    </>
  );
}
