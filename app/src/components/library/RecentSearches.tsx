import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { Clock, X } from "lucide-react";
import {
  librarySearchHistoryAtom,
  forgetSearchAtom,
  clearSearchHistoryAtom,
} from "../../atoms/library";

interface Props {
  /** The search box the panel hangs under — measured, never wrapped. */
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  /** Re-run this search (fills the box and commits it). */
  onPick: (query: string) => void;
  onClose: () => void;
}

/** The searches you already ran, offered back when you focus the search box.
 *
 *  **Coexistence with `SearchTipsPopover`** — both live in this one box, so they
 *  are deliberately triggered by different things and can't both be open:
 *  recents follow FOCUS, tips follow a CLICK on the tips chip, and clicking the
 *  chip blurs the input, which closes this. No shared open-state, no arbitration;
 *  the focus model does it. This panel also matches the tips popover's mechanics
 *  — portalled to `body` and positioned from the anchor's rect — because the
 *  toolbar clips an absolutely-positioned child, and two panels dropping out of
 *  the same box should drop the same way.
 *
 *  Entries are recorded on SETTLE, not per keystroke (see `recordSearchAtom`),
 *  so this lists searches rather than typing. */
export function RecentSearches({ anchorRef, open, onPick, onClose }: Props) {
  const history = useAtomValue(librarySearchHistoryAtom);
  const forget = useSetAtom(forgetSearchAtom);
  const clearAll = useSetAtom(clearSearchHistoryAtom);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  const showing = open && history.length > 0;

  useLayoutEffect(() => {
    if (!showing || !anchorRef.current) return setPos(null);
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ left: r.left, top: r.bottom + 4, width: r.width });
  }, [showing, anchorRef, history.length]);

  useEffect(() => {
    if (!showing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    // A fixed panel goes stale the moment anything scrolls or resizes.
    const close = () => onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [showing, onClose]);

  if (!showing || !pos) return null;

  return createPortal(
    <div
      role="group"
      aria-label="Recent searches"
      // Keeps the input focused through a click in here: without it the
      // mousedown blurs the box, `open` flips false, and the panel unmounts
      // before the click can land on anything.
      onMouseDown={(e) => e.preventDefault()}
      className="fixed z-40 rounded-md bg-paper shadow-lg py-1"
      style={{
        left: pos.left,
        top: pos.top,
        width: pos.width,
        border: "1px solid var(--border-primary)",
      }}
    >
      <p className="flex items-center gap-1.5 px-2.5 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
        <Clock size={11} className="text-ink-muted" aria-hidden="true" />
        Recent searches
      </p>
      <ul className="flex flex-col">
        {history.map((q) => (
          <li key={q} className="group relative flex items-stretch">
            <button
              type="button"
              onClick={() => onPick(q)}
              className="flex-1 min-w-0 text-start ps-2.5 pe-8 py-1.5 text-xs text-ink
                hover:bg-warm transition-colors cursor-pointer focus:outline-none
                focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
            >
              <span className="block truncate">{q}</span>
            </button>
            {/* `group-focus-within` beside `group-hover`, or a keyboard user
                tabs to an invisible button. */}
            <button
              type="button"
              onClick={() => forget(q)}
              aria-label={`Forget search: ${q}`}
              className="absolute inset-y-0 end-1 my-auto w-5 h-5 flex items-center justify-center
                rounded text-ink-muted opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
                hover:text-ink hover:bg-parchment transition-all cursor-pointer
                focus:outline-none focus-visible:ring-1 focus-visible:ring-ink/20"
            >
              <X size={11} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-1 pt-1 px-2.5 pb-0.5" style={{ borderTop: "1px solid var(--border-soft)" }}>
        <button
          type="button"
          onClick={() => {
            clearAll();
            onClose();
          }}
          className="text-[11px] font-medium text-ink-tertiary hover:text-ink transition-colors
            cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ink/20 rounded-sm"
        >
          Clear all
        </button>
      </div>
    </div>,
    document.body,
  );
}
