import { useEffect, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { X } from "lucide-react";
import { languageAtom } from "../../atoms/language";

interface FiltersDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function FiltersDrawer({
  open,
  onClose,
  title = "Filters",
  children,
  footer,
  width = 340,
}: FiltersDrawerProps) {
  // Slide from the inline end — flips to the left edge under RTL (Arabic).
  const rtl = useAtomValue(languageAtom) === "AR";
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`absolute inset-0 z-30 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ backgroundColor: "rgba(38, 30, 20, 0.18)" }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute top-0 bottom-0 z-40 bg-paper shadow-lg flex flex-col transition-transform duration-200 ease-out ${
          rtl ? "left-0" : "right-0"
        } ${open ? "translate-x-0" : rtl ? "-translate-x-full" : "translate-x-full"}`}
        style={{
          width: `min(100%, ${width / 16}rem)`,
          borderInlineStart: "1px solid var(--border-primary)",
        }}
      >
        <header
          className="shrink-0 flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: "1px solid var(--border-primary)" }}
        >
          <span className="text-xs font-semibold text-ink-secondary">{title}</span>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="flex items-center justify-center w-5 h-5 rounded-sm text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </header>

        <div className="flex-1 overflow-auto">{children}</div>

        {footer && (
          <footer
            className="shrink-0 px-4 py-2"
            style={{ borderTop: "1px solid var(--border-primary)" }}
          >
            {footer}
          </footer>
        )}
      </aside>
    </>
  );
}
