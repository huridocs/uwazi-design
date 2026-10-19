import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, CheckSquare, ChevronDown } from "lucide-react";
import { BAR_GHOST } from "../shared/warmButton";
import { Hint } from "../shared/Hint";
import { useFooterFold } from "./footerFold";

/** The modifier this platform calls Cmd — Ctrl everywhere but Apple's. */
export const MOD_KEY =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "Cmd" : "Ctrl";

export interface ScopeItem {
  label: string;
  /** For the phone sheet, which lists icons; the menu draws none. */
  icon?: ReactNode;
  /** A second line under the label. */
  help?: string;
  onClick?: () => void;
  /** A state already reached ("All 652 selected"): listed, not pressed. */
  done?: boolean;
  /** Drawn after a separator (Clear selection). */
  apart?: boolean;
}

/** The Library footer's one selection control, in the same place idle and
 *  selecting: "Select ▾" with nothing picked, "652 selected ▾" once there is
 *  a selection or select mode is on. Its menu holds every scope action (the
 *  records, this page, every result, dropping the hidden ones, Clear) and,
 *  at its top, where the selection sits as text. The bar shows at most one
 *  short line under the count (`note`), in a slot that keeps its two lines,
 *  so the bar never grows and nothing moves when the note comes or goes.
 *
 *  Same menu shape as `SelectionActionsMenu`: opens upward, focus on the
 *  first item, arrows move, Escape closes and returns focus to the trigger. */
export function SelectionScopeMenu({
  count,
  note,
  name,
  summary,
  items,
}: {
  /** The selection's size, or undefined while nothing is being selected. */
  count?: number;
  /** One short line under the count, only when something needs saying. */
  note?: string;
  /** The trigger's accessible name: the count and what the note says. */
  name: string;
  /** Where the selection sits, at the menu's top. */
  summary?: { head: string; lines: string[] };
  items: ScopeItem[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const summaryId = useId();
  const selecting = count !== undefined;
  // Idle, the word folds with the bar's other actions; the count never does.
  const fold = useFooterFold();
  const iconOnly = !selecting && fold >= 1;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const list = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      list[e.key === "Home" ? 0 : list.length - 1]?.focus();
    }
  };
  const row = "w-full px-3 py-1.5 text-start text-xs rounded-md tabular-nums";

  let trigger: ReactNode;
  if (selecting) {
    trigger = (
      <button
        ref={triggerRef}
        type="button"
        aria-label={name}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`relative w-full h-full flex items-center px-2.5 text-start leading-tight tabular-nums ${BAR_GHOST} aria-expanded:bg-warm rounded-md transition-colors cursor-pointer`}
      >
        {/* The count sits at the slot's middle whether or not a note is
            under it; the note is a caption placed below the middle, so it
            comes and goes without moving the count. */}
        <span className="flex items-center gap-1 max-w-full text-xs font-semibold text-ink">
          <span className="truncate"><bdi>{count.toLocaleString()} selected</bdi></span>
          <ChevronDown size={12} className="shrink-0 text-ink-tertiary" aria-hidden />
        </span>
        {note && (
          <span
            data-part="note"
            aria-hidden
            className="absolute inset-x-2.5 top-1/2 mt-[0.5rem] text-meta leading-tight text-ink-tertiary truncate"
          >
            <bdi>{note}</bdi>
          </span>
        )}
      </button>
    );
  } else {
    trigger = (
      <Hint text="Select records, this page or every result" describe={false} muted={!iconOnly}>
        {(hint) => (
          <button
            {...hint}
            ref={triggerRef}
            type="button"
            aria-label={name}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className={`flex items-center gap-1.5 ${iconOnly ? "ps-2.5" : "ps-3"} pe-2 py-1.5 text-xs font-medium ${BAR_GHOST} aria-expanded:bg-warm rounded-md transition-colors cursor-pointer`}
          >
            <CheckSquare size={13} className="text-ink-tertiary" aria-hidden />
            {!iconOnly && <span>Select</span>}
            <ChevronDown size={12} className="text-ink-tertiary" aria-hidden />
          </button>
        )}
      </Hint>
    );
  }

  return (
    <div
      ref={wrapRef}
      data-component="SelectionScopeMenu"
      // The count's slot is fixed, sized for "4,398 selected" and its note.
      className={`relative shrink-0 flex items-center ${selecting ? "w-[9rem] self-stretch py-0.5" : ""}`}
    >
      {trigger}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={selecting ? "Selection" : "Select"}
          aria-describedby={summary ? summaryId : undefined}
          onKeyDown={onKeyDown}
          onBlur={(e) => {
            const to = e.relatedTarget as Node | null;
            if (to && wrapRef.current?.contains(to)) return;
            setOpen(false);
          }}
          className="absolute bottom-full end-0 mb-1.5 z-30 w-64 p-1 bg-paper rounded-md border border-border shadow-lg"
        >
          {summary && (
            <div id={summaryId} data-part="summary" className="px-3 pt-1.5 pb-2 mb-1 border-b border-border-soft tabular-nums">
              <p className="text-xs font-semibold text-ink"><bdi>{summary.head}</bdi></p>
              {summary.lines.map((l) => (
                <p key={l} className="text-meta text-ink-tertiary">
                  <bdi>{l}</bdi>
                </p>
              ))}
            </div>
          )}
          {items.map((it) => (
            <div key={it.label}>
              {it.apart && <div role="separator" className="my-1 h-px bg-border" />}
              {it.done ? (
                // A state reached, not an action: the words in ink with a
                // check at the row's end, so the text keeps the column.
                <p
                  role="menuitem"
                  aria-disabled
                  tabIndex={-1}
                  className={`${row} flex items-center gap-2 text-ink-secondary focus:outline-none focus-visible:bg-warm`}
                >
                  <span className="flex-1 min-w-0"><bdi>{it.label}</bdi></span>
                  <Check size={13} className="shrink-0 text-ink" aria-hidden />
                </p>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    it.onClick?.();
                  }}
                  className={`${row} flex flex-col items-start text-ink hover:bg-warm focus:outline-none focus-visible:bg-warm cursor-pointer`}
                >
                  <span><bdi>{it.label}</bdi></span>
                  {it.help && <span className="text-meta text-ink-tertiary"><bdi>{it.help}</bdi></span>}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
