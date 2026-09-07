import { createContext, useContext, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAtomValue } from "jotai";
import { X } from "lucide-react";
import { languageAtom } from "../../atoms/language";
import { useFocusTrap } from "../../hooks/useFocusTrap";

/** The element a `FiltersDrawer` should render INTO, when it must escape the
 *  box it is called from.
 *
 *  The drawer is `absolute inset-0` — it covers its nearest positioned ancestor
 *  and is clipped by the nearest `overflow-hidden` one, which is what makes it
 *  a pane-scoped slide-over rather than a page-wide modal. In the entity view
 *  those two are the same element and the drawer covers the whole pane. In the
 *  preview panel they are not: the tab content is its own `relative
 *  overflow-hidden` box (the graph needs it), so the drawer covered the tab
 *  area only, starting under the tab strip and stopping above the footer.
 *
 *  Positioning alone can't fix that — an `overflow-hidden` ancestor still clips
 *  whatever the drawer is positioned against — so a host that needs the whole
 *  panel names itself here and the drawer portals to it. No provider means the
 *  old behaviour, unchanged: the entity view renders one inline and is
 *  untouched. */
const FiltersHostContext = createContext<HTMLElement | null>(null);

export function FiltersHostProvider({
  host,
  children,
}: {
  host: HTMLElement | null;
  children: ReactNode;
}) {
  return <FiltersHostContext.Provider value={host}>{children}</FiltersHostContext.Provider>;
}

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
  const trapRef = useFocusTrap<HTMLElement>(open);

  // While closed the drawer stays mounted (translated off-pane) — mark it
  // inert so Tab can never focus its controls: focusing a child would make
  // the browser force-scroll the overflow-hidden pane to reveal it, leaving
  // the "closed" drawer visually parked over the content.
  useEffect(() => {
    trapRef.current?.toggleAttribute("inert", !open);
  }, [open, trapRef]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const host = useContext(FiltersHostContext);

  const content = (
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
        ref={trapRef as React.Ref<HTMLElement>}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // A closed drawer is hidden by TWO things, and it needs both.
        //
        // The slide is the animation, and it was also the only thing keeping a
        // closed drawer off screen — `translate-x-full` parking it one width
        // past its pane. That is a bet on the transform landing, and it does not
        // always: measured here, a closed drawer reported `translate: 100%` in
        // its computed style and a bounding rect with NO displacement, so it sat
        // fully visible at its `right-0` position. It only LOOKED hidden while
        // its pane happened to extend past the viewport — and the moment the
        // connection overlay changed the pane's geometry, a drawer nobody had
        // opened appeared beside it, over a blank overlay body. That is the
        // "opening a relationship triggers the filters" report: nothing opened
        // it; it had been on screen all along, waiting for the layout to reveal
        // it.
        //
        // So opacity carries the hiding and the transform carries the motion.
        // They share a duration, so an open drawer still slides and a closed one
        // still slides away; if the translate is dropped the drawer is merely
        // motionless, never visible. `pointer-events-none` matches `inert`
        // below, which was already right and was the only reason a drawer
        // sitting in plain sight could not also be clicked.
        className={`absolute top-0 bottom-0 z-40 bg-paper shadow-lg flex flex-col
          transition-[transform,opacity] duration-200 ease-out ${
            rtl ? "left-0" : "right-0"
          } ${
            open
              ? "translate-x-0 opacity-100"
              : `opacity-0 pointer-events-none ${rtl ? "-translate-x-full" : "translate-x-full"}`
          }`}
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

  // The portal moves where this renders, not who owns it: the focus trap, the
  // `inert` toggle and the Escape handler are all on the `aside` and travel
  // with it, and React context still flows from the caller.
  return host ? createPortal(content, host) : content;
}
