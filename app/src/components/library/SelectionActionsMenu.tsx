import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { BAR_GHOST } from "../shared/warmButton";
import type { SelectionAction } from "./selectionActions";

/** The selection drawer's "Actions" — the footer bar's actions that don't fit
 *  a 24rem footer, as a menu: Change template, Export CSV, Share, Permissions,
 *  and Delete last, after a separator, in seal. They fire the same handlers as
 *  the bar's buttons. A real `role="menu"`: arrow keys move, Enter / Space
 *  choose, Escape closes and returns focus to the button. Opens upward — it
 *  sits in a footer. Disabled items stay listed, saying why. */
export function SelectionActionsMenu({ actions }: { actions: SelectionAction[] }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const regular = actions.filter((a) => !a.danger);
  const danger = actions.filter((a) => a.danger);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
      next?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      items[e.key === "Home" ? 0 : items.length - 1]?.focus();
    }
  };
  const item = (a: SelectionAction) => (
    <button
      key={a.id}
      type="button"
      role="menuitem"
      aria-disabled={a.disabledReason ? true : undefined}
      aria-describedby={a.disabledReason ? `sel-action-${a.id}-why` : undefined}
      onClick={() => {
        if (a.disabledReason) return;
        close();
        a.onClick?.();
      }}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-start text-xs rounded-md focus:outline-none focus-visible:bg-warm ${
        a.disabledReason
          ? "text-ink-muted cursor-not-allowed"
          : a.danger
            ? "text-seal-label hover:bg-seal-tint/40 cursor-pointer"
            : "text-ink hover:bg-warm cursor-pointer"
      }`}
    >
      <span className={a.danger ? "" : "text-ink-tertiary"} aria-hidden>
        {a.icon}
      </span>
      <span className="flex-1 min-w-0">
        {a.label}
        {/* Why it is off, IN the item — a `title` never shows to a keyboard. */}
        {a.disabledReason && (
          <span id={`sel-action-${a.id}-why`} className="block text-meta text-ink-muted">
            {a.disabledReason}
          </span>
        )}
      </span>
    </button>
  );

  return (
    <div data-component="SelectionActionsMenu" className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        data-gutter-align="box"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${BAR_GHOST} aria-expanded:bg-warm aria-expanded:text-ink rounded-md transition-colors cursor-pointer`}
      >
        Actions
        <ChevronDown size={12} className="text-ink-tertiary" aria-hidden />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Selection actions"
          onKeyDown={onKeyDown}
          // Tabbing out of the menu closes it: left open, its items stayed in
          // the tab order behind whatever took the focus.
          onBlur={(e) => {
            const to = e.relatedTarget as Node | null;
            if (to && (menuRef.current?.contains(to) || buttonRef.current?.contains(to))) return;
            setOpen(false);
          }}
          className="absolute bottom-full end-0 mb-1.5 z-20 w-56 p-1 bg-paper rounded-md border border-border shadow-lg"
        >
          {regular.map(item)}
          {danger.length > 0 && <div role="separator" className="my-1 h-px bg-border" />}
          {danger.map(item)}
        </div>
      )}
    </div>
  );
}
