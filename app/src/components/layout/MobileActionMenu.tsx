import { useState, useEffect, useRef, ReactNode } from "react";
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

export function MobileActionMenu({ items }: MobileActionMenuProps) {
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center rounded-md border border-border hover:bg-warm transition-colors"
        style={{ width: 32, height: 32, color: "var(--text-secondary)" }}
        aria-label="More options"
        aria-expanded={open}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bg-paper rounded-md overflow-hidden"
          style={{
            bottom: "calc(100% + 6px)",
            left: 0,
            minWidth: 180,
            border: "1px solid var(--border-primary)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 80,
          }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors"
            >
              <div className="flex items-center gap-2">
                {item.icon && <span className="text-ink-tertiary">{item.icon}</span>}
                {item.label}
              </div>
              {item.count !== undefined && (
                <span className="text-[10px] font-semibold text-ink-tertiary">
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
