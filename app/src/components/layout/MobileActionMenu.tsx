import { useState, useEffect, useRef, ReactNode, type KeyboardEvent } from "react";
import { MoreHorizontal } from "lucide-react";

export interface MobileMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  onSelect: () => void;
}

interface MobileActionMenuProps {
  items: MobileMenuItem[];
}

const MENU_MIN_WIDTH = 180;

export function MobileActionMenu({ items, floating = false }: MobileActionMenuProps & {
  /** Floating over content, not hosted in a bar. Only then does the trigger
   *  draw a border: a bar button carries none, but a bare kebab over a page
   *  would have nothing to separate it from what is under it. */
  floating?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Which edge of the trigger the menu hangs from. Picked on open so the menu
  // grows into the viewport instead of off whichever edge the kebab sits near.
  const [align, setAlign] = useState<"left" | "right">("left");
  // …and which SIDE. This used to be hardcoded upward, which was right when the
  // kebab only ever sat on the bottom action bar. In the Library toolbar it sits
  // at the TOP, so the menu opened straight up behind the chrome and was
  // invisible. Same rule as the edge: grow into the viewport, not out of it.
  const [side, setSide] = useState<"top" | "bottom">("top");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  /** The item that holds the roving tab stop and has focus while open. */
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  /* THE MENU CONTRACT. `role="menu"` promises it, so it is kept: focus moves to
     an item on open, Up/Down move (and wrap), Home/End jump, Escape closes and
     returns to the trigger, Tab closes. Items carry a roving tab stop. Before
     this the role was all there was — a menu a keyboard could open and then not
     enter. */
  useEffect(() => {
    if (open) itemRefs.current[active]?.focus();
  }, [open, active]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const onMenuKeyDown = (e: KeyboardEvent) => {
    const last = items.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => (i >= last ? 0 : i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => (i <= 0 ? last : i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(last);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  const onTriggerKeyDown = (e: KeyboardEvent) => {
    // Arrow keys open onto the first or the last item, as a menu button does.
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) toggle();
      setActive(e.key === "ArrowDown" ? 0 : items.length - 1);
    }
  };

  const toggle = () => {
    setOpen((o) => {
      if (!o && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Anchor left (grow right) only if there's room; otherwise hang right.
        setAlign(rect.left + MENU_MIN_WIDTH <= window.innerWidth ? "left" : "right");
        // Drop DOWN when the space below the trigger can hold the menu; only fly
        // up when it can't. Rough height is enough — a row is ~36px.
        const needed = items.length * 36 + 8;
        setSide(window.innerHeight - rect.bottom >= needed ? "bottom" : "top");
        setActive(0);
      }
      return !o;
    });
  };

  return (
    <div ref={containerRef} data-component="MobileActionMenu" className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        onKeyDown={onTriggerKeyDown}
        data-part="trigger"
        aria-haspopup="menu"
        className={`flex items-center justify-center rounded-md hover:bg-warm aria-expanded:bg-warm transition-colors w-9 h-9 ${
          floating ? "border border-border bg-paper" : ""
        }`}
        style={{ color: "var(--text-secondary)" }}
        aria-label="More options"
        aria-expanded={open}
      >
        <MoreHorizontal size={16} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="More options"
          data-part="menu"
          onKeyDown={onMenuKeyDown}
          className="absolute bg-paper rounded-md overflow-hidden"
          style={{
            [side === "bottom" ? "top" : "bottom"]: "calc(100% + 6px)",
            [align]: 0,
            minWidth: MENU_MIN_WIDTH,
            border: "1px solid var(--border-primary)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 80,
          }}
        >
          {items.map((item, i) => (
            <button
              key={item.id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={i === active ? 0 : -1}
              data-part="item"
              onClick={() => {
                item.onSelect();
                close(true);
              }}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors"
            >
              <div className="flex items-center gap-2">
                {item.icon && <span className="text-ink-tertiary">{item.icon}</span>}
                {item.label}
              </div>
              {item.count !== undefined && (
                <span data-part="count" className="text-meta font-semibold text-ink-tertiary">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
