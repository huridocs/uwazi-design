import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSetAtom } from "jotai";
import { Lightbulb } from "lucide-react";
import { SectionLabel } from "../shared/SectionLabel";
import { librarySearchDraftAtom } from "../../atoms/library";

const PANEL_ID = "library-search-tips";
/** Rough panel height (header + 4 fixed rows) — only used to decide flip. */
const PANEL_EST_HEIGHT = 196;
const PANEL_WIDTH = 432; // 27rem — sized so the longest example+prose pair fits on ONE line

/** The operator tips, copied (shortened) from real Uwazi's
 *  `SearchTipsContent.tsx`. Each row is a mono `example` (the syntax itself —
 *  clickable to drop into the search box) and a plain-language `prose` outcome.
 *
 *  There are deliberately NO symbol chips. A shared column of `*` … `AND OR NOT`
 *  can never align — one glyph against eleven — and the column had to be sized
 *  for the widest, which stranded the short ones and squeezed every description
 *  into two lines. The EXAMPLE is the syntax, so the symbol column was carrying
 *  no information the example didn't already show.
 *
 *  ONLY WHAT RUNS. Every row here is syntax the Library filter implements
 *  (`parseSearchQuery` / `termIn` in `utils/queryTokens.ts`): `*` and `?` match
 *  within whole words, quotes keep a phrase together, `AND`/`OR`/`NOT` combine.
 *  Proximity (`"a b"~5`) was listed and matched nothing — it tokenized into a
 *  phrase plus a literal `~5` — so it is gone until the pipeline keeps word
 *  positions. Don't add a tip for an operator the filter doesn't parse.
 *  Quotes are STRAIGHT: the tokenizer's phrase regex only recognises `"`, so a
 *  typographic quote would insert a query that silently matches nothing. */
const TIPS: { example: string; prose: string }[] = [
  { example: "juris*", prose: "matches jurisdiction, jurists, jurisprudence" },
  { example: "198?", prose: "any single character" },
  { example: '"Costa Rica"', prose: "the words together, in that order" },
];

/** The booleans sit in a final FULL-WIDTH row: the example alone is ~30 mono
 *  characters, so holding it in the start column would have set that column's
 *  width for all four rows and pushed the panel past 30rem. Spanning is the
 *  cheaper compromise — it costs this one row's column alignment, not the
 *  panel's whole proportion. */
const BOOLEAN_TIP = {
  example: "Chile OR Peru NOT Bolivia",
  prose: "either one, never the last",
};

/** One rhythm for every row — the grid rows and the spanning boolean row share
 *  these so the vertical spacing stays even across the break in layout. */
const ROW_CLASS =
  "w-full rounded-md px-2 py-2 text-left hover:bg-parchment transition-colors cursor-pointer " +
  "focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20";
const EXAMPLE_CLASS = "whitespace-nowrap font-mono text-meta leading-snug text-ink";
const PROSE_CLASS = "min-w-0 text-meta leading-snug text-ink-secondary";

/** A small tag-style "tips" chip that sits inside the Library search box (after
 *  the clear button). Clicking opens the operator tips as a popover anchored
 *  below the chip, PORTALLED to `body` so the overflow-hidden toolbar can't clip
 *  it. Escape and outside-click close it; the chip is keyboard-focusable and the
 *  panel is `aria-controls`-linked.
 *
 *  Each tip row is a button: clicking drops its example into the search box
 *  (which live-runs the search) and closes the popover. */
export function SearchTipsPopover({
  onInsert,
  compact = false,
}: {
  /** Icon only. For a search box on a narrow pane, where the word costs the
   *  input a third of its width. Set from the host's WIDTH, never from whether
   *  the box holds text, so typing cannot resize the input. */
  compact?: boolean;
  /** Where a clicked example goes. Defaults to the Library search box; the
   *  entity drawer's Search tab passes its own setter. */
  onInsert?: (example: string) => void;
} = {}) {
  const [open, setOpen] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  // The DRAFT, not the committed query: a non-empty draft commits itself, so
  // the example both runs and shows up in the box. Writing the committed atom
  // alone would search for something the empty-looking box never mentions.
  const setQuery = useSetAtom(librarySearchDraftAtom);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = chipRef.current?.getBoundingClientRect();
      if (!r) return;
      // END-align: the panel's RIGHT edge sits at the chip's right edge, so it
      // grows leftward toward the search box — never rightward over the toolbar
      // controls. Viewport-clamped on both edges so it's never clipped.
      const left = Math.max(8, Math.min(r.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8));
      // Flip ABOVE the trigger when there isn't room below — the drawer's action
      // bar sits at the foot of the pane, so "below" would be off-screen.
      const below = r.bottom + 6;
      const top =
        below + PANEL_EST_HEIGHT > window.innerHeight - 8
          ? Math.max(8, r.top - PANEL_EST_HEIGHT - 6)
          : below;
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
    (onInsert ?? setQuery)(example);
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
        data-component="SearchTipsPopover"
        data-part="trigger"
        className="shrink-0 inline-flex items-center gap-1 h-5 px-1.5 rounded text-meta font-medium
          text-ink-tertiary bg-warm hover:bg-parchment hover:text-ink-secondary transition-colors
          cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
      >
        <Lightbulb size={11} aria-hidden="true" />
        {compact ? <span className="sr-only">tips</span> : "tips"}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            id={PANEL_ID}
            role="dialog"
            aria-label="Search tips"
            data-component="SearchTipsPopover"
            data-part="panel"
            className="fixed z-50 rounded-lg border border-border bg-paper p-2 shadow-lg animate-fade-in-up"
            style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
          >
            {/* Header — frames the list and names the intent. */}
            <header data-part="header" className="flex items-center gap-1.5 px-2 pt-1 pb-2 mb-1 border-b border-border-soft">
              <Lightbulb size={12} className="text-ink-tertiary" aria-hidden="true" />
              <SectionLabel as="h2">Narrow your search</SectionLabel>
            </header>

            <ul data-part="tips" className="flex flex-col">
              {TIPS.map((tip) => (
                <li key={tip.example} data-part="tip">
                  <button
                    type="button"
                    onClick={() => insert(tip.example)}
                    aria-label={`Search: ${tip.example}`}
                    className={ROW_CLASS + " grid grid-cols-[7rem_1fr] items-baseline gap-x-3"}
                  >
                    {/* Both columns start-aligned: the example is the syntax, so
                        it reads as a column of things you could type, and every
                        description begins at the same x. The panel is sized so
                        neither side wraps — one line per rule. */}
                    <span dir="ltr" className={EXAMPLE_CLASS}>
                      {tip.example}
                    </span>
                    <span className={PROSE_CLASS}>{tip.prose}</span>
                  </button>
                </li>
              ))}
              {/* Booleans — full width, example and prose on one line. */}
              <li data-part="tip">
                <button
                  type="button"
                  onClick={() => insert(BOOLEAN_TIP.example)}
                  aria-label={`Search: ${BOOLEAN_TIP.example}`}
                  className={ROW_CLASS + " flex items-baseline gap-x-3"}
                >
                  <span dir="ltr" className={EXAMPLE_CLASS}>
                    {BOOLEAN_TIP.example}
                  </span>
                  <span className={PROSE_CLASS}>{BOOLEAN_TIP.prose}</span>
                </button>
              </li>
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
