import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { useAtom } from "jotai";
import { X } from "lucide-react";
import { libraryRailPanelAtom, type LibraryRailPanel } from "../../atoms/library";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useOverlayLayer } from "../../hooks/useOverlayLayer";
import { DRAWER_MIN_WIDTH, DrawerWidthProvider, useDrawerWidth } from "../../hooks/useDrawerWidth";

/* Full width layout (`libraryLayoutAtom = "full"`): the Library's main pane
   takes the whole width, and what the drawer held moves to two places over the
   pane's view lane:
   - the rail, a floating column of icon buttons at the lane's top end, each
     opening one panel anchored beside it (Filters, Results, Notebook, Views);
   - the pane slide-over, which takes the drawer's other contents (the record
     preview, the selection list, a map cluster) at the drawer's width.
   Both mount inside `LibraryFullWidthLayer`, which spans the lane from pane
   edge to pane edge. The bodies are the drawer's own; nothing is forked. */

/** How far the rail reaches into the lane from its end edge, past the gutter:
 *  the rail (2.25rem) and the gap before the panel or the content (0.5rem). The
 *  scrolling views pad their end by this so the rail never covers a card. */
export const RAIL_RESERVE = "2.75rem";

/** The anchored panel's width: the Notebook slide-over's. */
const PANEL_REM = 26;

export interface RailItem {
  id: LibraryRailPanel;
  label: string;
  icon: ReactNode;
  /** User-set state behind a closed panel, as the drawer tabs mark it. */
  dot?: boolean;
  /** Why the item cannot open now; the button stays, so the rail never moves. */
  disabledReason?: string;
  /** The panel's body. `ownHeader`: it draws its own title and close. */
  body: ReactNode;
  ownHeader?: boolean;
  /** As tall as its content (up to the lane), not the lane's height. */
  fit?: boolean;
}

/** The positioned layer over the view lane. `bleed-flush` geometry by hand:
 *  the lane's wrapper sits on the gutter, the layer reaches the pane edges. */
export function LibraryFullWidthLayer({ children }: { children: ReactNode }) {
  return (
    <div
      data-component="LibraryFullWidthLayer"
      // `clip`, not `hidden`: the closed slide-over waits past the pane edge,
      // and a `hidden` box is still a scroll container that focus or a
      // scrollIntoView can scroll sideways.
      className="absolute inset-y-0 z-30 pointer-events-none overflow-clip"
      style={{ insetInline: "calc(var(--gutter, 0px) * -1)" }}
    >
      {children}
    </div>
  );
}

/** The rail and its one open panel. */
export function LibraryRail({ items }: { items: RailItem[] }) {
  const [open, setOpen] = useAtom(libraryRailPanelAtom);
  const ids = useId();
  const current = items.find((i) => i.id === open && !i.disabledReason) ?? null;
  // The body lags the close by the slide-out, so the panel does not empty on
  // its way off.
  const [shown, setShown] = useState<RailItem | null>(current);
  useEffect(() => {
    if (current) {
      setShown(current);
      return;
    }
    const t = window.setTimeout(() => setShown(null), 200);
    return () => window.clearTimeout(t);
  }, [current]);
  // A panel whose item went disabled (Adv. Search took the main pane) closes.
  useEffect(() => {
    if (open && !current) setOpen(null);
  }, [open, current, setOpen]);

  const isOpen = current !== null;
  const panelRef = useFocusTrap<HTMLDivElement>(isOpen, shown?.id);
  useEffect(() => {
    panelRef.current?.toggleAttribute("inert", !isOpen);
  }, [isOpen, panelRef]);
  const layer = useOverlayLayer(isOpen);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && layer.isTopNow()) {
        e.preventDefault();
        setOpen(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, layer, setOpen]);

  const panelId = `${ids}-panel`;
  const titleId = `${ids}-title`;

  return (
    <>
      <div
        role="toolbar"
        aria-orientation="vertical"
        aria-label="Library panels"
        data-component="LibraryRail"
        className="pointer-events-auto absolute top-3 flex flex-col gap-0.5 p-0.5 bg-paper border border-border rounded-lg shadow-sm"
        style={{ insetInlineEnd: "var(--gutter, 0px)" }}
      >
        {items.map((item) => {
          const active = current?.id === item.id;
          const disabled = !!item.disabledReason;
          return (
            <button
              key={item.id}
              type="button"
              data-part="rail-item"
              data-item={item.id}
              aria-label={disabled ? `${item.label} (${item.disabledReason})` : item.label}
              title={disabled ? item.disabledReason : item.label}
              aria-haspopup="dialog"
              aria-expanded={active}
              aria-controls={active ? panelId : undefined}
              aria-disabled={disabled || undefined}
              onClick={() => {
                if (disabled) return;
                setOpen(active ? null : item.id);
              }}
              className={`relative w-8 h-8 flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 ${
                disabled
                  ? "text-ink-muted cursor-default"
                  : active
                    ? "bg-parchment text-ink cursor-pointer"
                    : "text-ink-secondary hover:bg-warm hover:text-ink cursor-pointer"
              }`}
            >
              {item.icon}
              {/* The drawer tabs' dot: decorative, the panel announces its state. */}
              {item.dot && !active && !disabled && (
                <span
                  aria-hidden="true"
                  data-part="dot"
                  className="absolute top-1 end-1 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "var(--accent-blue)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-labelledby={shown && !shown.ownHeader ? titleId : undefined}
        aria-label={shown?.ownHeader ? shown.label : undefined}
        tabIndex={-1}
        data-component="LibraryRailPanel"
        data-panel={shown?.id}
        data-state={isOpen ? "open" : "closed"}
        className={`absolute top-3 ${shown?.fit ? "max-h-[calc(100%-1.5rem)]" : "bottom-3"} flex flex-col bg-paper border border-border rounded-lg shadow-lg overflow-hidden
          transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none ${
            isOpen ? "pointer-events-auto opacity-100 translate-x-0" : "pointer-events-none opacity-0 translate-x-2 rtl:-translate-x-2"
          }`}
        style={{
          insetInlineEnd: `calc(var(--gutter, 0px) + ${RAIL_RESERVE})`,
          width: `min(${PANEL_REM}rem, calc(100% - 2 * var(--gutter, 0px) - ${RAIL_RESERVE}))`,
        }}
      >
        {shown &&
          (shown.ownHeader ? (
            shown.body
          ) : (
            <div data-gutter-host className={`gutter-host flex flex-col min-h-0 ${shown.fit ? "" : "h-full"}`}>
              <div className="shrink-0 h-10 flex items-center justify-between gap-2">
                <h2 id={titleId} className="text-sm font-semibold text-ink">
                  {shown.label}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  aria-label={`Close ${shown.label}`}
                  className="hit-area w-7 h-7 -me-1.5 flex items-center justify-center rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
              {/* The drawer's body lane: `bleed` for the lanes inside to reach
                  the panel edge. The panel's width stands in for the drawer's. */}
              <div className={`bleed flex-1 min-h-0 overflow-hidden ${shown.fit ? "flex flex-col" : ""}`}>
                <DrawerWidthProvider value={PANEL_REM * 16}>{shown.body}</DrawerWidthProvider>
              </div>
            </div>
          ))}
      </div>
    </>
  );
}

/** The drawer's other contents, slid over the pane at the drawer's width (the
 *  one remembered for every drawer host). Non-modal, as the drawer is: the
 *  results stay live beside it, and a click on another record swaps it.
 *  Escape runs `onClose` unless a layer above it (a nested preview, a dialog)
 *  takes the key. */
export function LibraryPaneSlideOver({
  hostRef,
  open,
  label,
  onClose,
  children,
}: {
  /** The pane it measures its width against (half of it at most). */
  hostRef: RefObject<HTMLElement | null>;
  open: boolean;
  label: string;
  onClose: (() => void) | null;
  children: ReactNode;
}) {
  const { width, measured } = useDrawerWidth(hostRef, { defaultWidth: 460, minWidth: DRAWER_MIN_WIDTH });
  // The last contents stay through the slide-out, so the panel does not empty
  // on its way off the pane.
  const last = useRef<ReactNode>(null);
  if (open) last.current = children;
  const [lingering, setLingering] = useState(false);
  useEffect(() => {
    if (open) return;
    setLingering(true);
    const t = window.setTimeout(() => setLingering(false), 250);
    return () => window.clearTimeout(t);
  }, [open]);
  const body = open ? children : lingering ? last.current : null;

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.toggleAttribute("inert", !open);
  }, [open]);
  const layer = useOverlayLayer(open);
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || !layer.isTopNow()) return;
      // Escape in a field or a menu is that control's.
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [role=menu], [role=listbox]")) return;
      if (document.querySelector('[aria-haspopup][aria-expanded="true"]')) return;
      e.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, layer]);

  return (
    <aside
      ref={ref}
      aria-label={label}
      data-component="LibraryPaneSlideOver"
      data-state={open ? "open" : "closed"}
      className={`absolute top-0 bottom-0 end-0 z-10 flex flex-col bg-paper overflow-hidden
        transition-transform duration-250 ease-out motion-reduce:transition-none ${
          open ? "pointer-events-auto translate-x-0" : "pointer-events-none translate-x-full rtl:-translate-x-full"
        }`}
      style={{
        width,
        borderInlineStart: "1px solid var(--border-primary)",
        boxShadow: open ? "-4px 0 16px rgba(0,0,0,0.08)" : "none",
      }}
    >
      <DrawerWidthProvider value={width}>{measured && body}</DrawerWidthProvider>
    </aside>
  );
}
