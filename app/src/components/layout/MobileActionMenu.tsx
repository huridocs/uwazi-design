import { useState, useEffect, useRef, ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

export interface MobileMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  /** A no-op right now (Select all with everything selected): listed, greyed. */
  disabled?: boolean;
  onSelect: () => void;
}

interface MobileActionMenuProps {
  items: MobileMenuItem[];
  /** The trigger's and menu's name. Defaults to the sheet menu's "More
   *  options"; a bar's overflow of actions names itself differently so the two
   *  kebabs side by side are not announced as the same control. */
  label?: string;
  /** The trigger glyph. Defaults to a horizontal ellipsis. */
  icon?: ReactNode;
}

const MENU_MIN_WIDTH = 180;

export function MobileActionMenu({ items, floating = false, label = "More options", icon }: MobileActionMenuProps & {
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
      }
      return !o;
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggle}
        className={`flex items-center justify-center rounded-md hover:bg-warm aria-expanded:bg-warm transition-colors w-9 h-9 ${
          floating ? "border border-border bg-paper" : ""
        }`}
        style={{ color: "var(--text-secondary)" }}
        aria-label={label}
        aria-expanded={open}
      >
        {icon ?? <MoreHorizontal size={16} />}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
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
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              // aria-disabled, not disabled: the item stays in the menu, greyed.
              aria-disabled={item.disabled || undefined}
              onClick={() => {
                if (item.disabled) return;
                item.onSelect();
                setOpen(false);
              }}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors aria-disabled:text-ink-muted aria-disabled:hover:bg-transparent aria-disabled:cursor-default"
            >
              <div className="flex items-center gap-2">
                {item.icon && <span className="text-ink-tertiary">{item.icon}</span>}
                {item.label}
              </div>
              {item.count !== undefined && (
                <span className="text-meta font-semibold text-ink-tertiary">
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
