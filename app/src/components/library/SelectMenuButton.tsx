import { useEffect, useRef, useState } from "react";
import { CheckSquare, ChevronDown } from "lucide-react";
import { BAR_GHOST } from "../shared/warmButton";
import { Hint } from "../shared/Hint";

/** The modifier this platform calls Cmd — Ctrl everywhere but Apple's. */
const MOD_KEY =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "Cmd" : "Ctrl";

/** The idle Library footer's way into a selection: a menu of its three
 *  scopes, each named with what it covers. "Select records" turns on select
 *  mode (a click on a record adds or removes it); the other two select the
 *  page shown or every result, and turn on select mode too, so the next click
 *  refines the set instead of replacing it. Cmd/Ctrl and Shift + click still
 *  start a selection from the view without it.
 *
 *  Same menu shape as `CreateEntityButton`: opens upward, focus on the first
 *  item, arrows move, Escape closes and returns focus to the trigger. */
export function SelectMenuButton({
  pageCount,
  total,
  paged,
  filtersActive = false,
  onRecords,
  onPage,
  onAll,
}: {
  /** The records the view draws (a page of Cards, List or Adv. Search). */
  pageCount: number;
  /** Every result of the search and its filters. */
  total: number;
  /** The view pages its results: the middle item means "this page". */
  paged: boolean;
  /** Filters narrow the results: the last item says "filtered". */
  filtersActive?: boolean;
  onRecords: () => void;
  onPage: () => void;
  onAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (fn: () => void) => {
    setOpen(false);
    triggerRef.current?.focus();
    fn();
  };
  const item =
    "w-full flex flex-col items-start px-2.5 py-1.5 text-start text-xs text-ink rounded-sm tabular-nums hover:bg-parchment focus:bg-parchment focus:outline-none cursor-pointer";
  // More results than the view draws: "every result" is a scope of its own.
  const acrossPages = total > pageCount;

  return (
    <div ref={wrapRef} data-component="SelectMenuButton" className="relative hidden sm:flex shrink-0 items-center">
      <Hint text="Select records, this page or every result" describe={false} muted>
        {(hint) => (
          <button
            {...hint}
            ref={triggerRef}
            type="button"
            aria-label="Select"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className={`flex items-center gap-1.5 ps-3 pe-2 py-1.5 text-xs font-medium ${BAR_GHOST} aria-expanded:bg-warm rounded-md transition-colors cursor-pointer`}
          >
            <CheckSquare size={13} className="text-ink-tertiary" aria-hidden />
            <span>Select</span>
            <ChevronDown size={12} className="text-ink-tertiary" aria-hidden />
          </button>
        )}
      </Hint>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Select"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              triggerRef.current?.focus();
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
              const i = items.indexOf(document.activeElement as HTMLElement);
              items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
            }
          }}
          className="absolute bottom-full end-0 mb-1.5 z-30 w-64 p-1 bg-paper rounded-md border border-border shadow-lg"
        >
          <button type="button" role="menuitem" onClick={() => pick(onRecords)} className={item}>
            <span>Select records</span>
            <span className="text-meta text-ink-tertiary">
              {`Click records to add them. ${MOD_KEY} + click works anytime.`}
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            aria-disabled={pageCount === 0 || undefined}
            onClick={() => pageCount > 0 && pick(onPage)}
            className={item}
          >
            {paged ? `Select this page (${pageCount.toLocaleString()})` : `Select all shown (${pageCount.toLocaleString()})`}
          </button>
          {acrossPages && (
            <button type="button" role="menuitem" onClick={() => pick(onAll)} className={item}>
              {`Select all ${total.toLocaleString()}${filtersActive ? " filtered" : ""} results`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
