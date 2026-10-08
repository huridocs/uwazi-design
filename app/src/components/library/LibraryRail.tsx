import { useEffect, useId, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { useAtom, useSetAtom } from "jotai";
import { X } from "lucide-react";
import { libraryRailInsetAtom, libraryRailPanelAtom, NO_RAIL_INSET, type LibraryRailPanel } from "../../atoms/library";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useOverlayLayer } from "../../hooks/useOverlayLayer";
import { DrawerWidthProvider } from "../../hooks/useDrawerWidth";

/* Full width layout (`libraryLayoutAtom = "full"`): the Library's main pane
   takes the whole width, and what the drawer held moves to two places over the
   pane's view lane:
   - the rail, a floating column of icon buttons at the lane's top end, each
     opening one panel anchored beside it (Filters, Results, Notebook, Views);
   - the same panel takes the drawer's other contents (the record preview, the
     selection list, a map cluster) when the Library opens one. One panel at a
     time: opening a record closes Filters, and a rail item closes the record.
   Both mount inside `LibraryFullWidthLayer`, which spans the lane from pane
   edge to pane edge. The bodies are the drawer's own; nothing is forked. */

/** How far the rail reaches into the lane from its end edge, past the gutter:
 *  the rail (2.25rem) and the gap before the panel or the content (0.5rem). The
 *  scrolling views pad their end by this so the rail never covers a card. */
export const RAIL_RESERVE = "2.75rem";

/** The anchored panel's width, the same for every panel: the drawer's default
 *  (460px), so the record preview's footer keeps "View entity" on one line. */
const PANEL_REM = 29;
/** A panel sized to its content starts this tall, so a body that fills in
 *  after it opens (a preview's files, a list's rows) grows it less. */
const PANEL_MIN_REM = 10;

export interface RailItem {
  id: LibraryRailPanel;
  label: string;
  icon: ReactNode;
  /** User-set state behind a closed panel, as the drawer tabs mark it. */
  dot?: boolean;
  /** A count drawn on the button (the Notebook's pins), when above zero, and
   *  what it counts, for the button's name ("Notebook, 2 pinned"). */
  count?: number;
  countNoun?: string;
  /** Why the item cannot open now; the button stays, so the rail never moves. */
  disabledReason?: string;
  /** The panel's body. `ownHeader`: it draws its own title and close. */
  body: ReactNode;
  ownHeader?: boolean;
  /** As tall as its content (up to the lane), not the lane's height. */
  fit?: boolean;
}

/** What the Library opened into the panel itself: the record preview, the
 *  selection list or a map cluster. Each body draws its own title and close. */
export interface RailPane {
  /** Which body; a change moves focus into the panel again. */
  key: string;
  label: string;
  body: ReactNode;
  /** Escape's action, or null when the Library's own Escape handles it. */
  onEscape: (() => void) | null;
  /** Close it, then run `next` (a rail item opening). A dirty edit may stop
   *  the close, and then `next` does not run. */
  close: (next: () => void) => void;
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

/** The rail and its one open panel. `fitContent` (Full width, not Split's
 *  panes): every panel is as tall as its content, up to the lane, and the
 *  width it covers is published (`libraryRailInsetAtom`) for Map and Network
 *  to fit and centre beside it. */
export function LibraryRail({ items, pane, fitContent = false }: { items: RailItem[]; pane: RailPane | null; fitContent?: boolean }) {
  const [open, setOpen] = useAtom(libraryRailPanelAtom);
  const ids = useId();
  const railItem = items.find((i) => i.id === open && !i.disabledReason) ?? null;
  // The Library's own panel wins; the host closes a rail panel when one opens.
  // Memoised: a fresh object on each of this component's renders re-ran the
  // effect below, whose `setShown` rendered again, without end while a record
  // was open.
  const paneKey = pane?.key;
  const paneLabel = pane?.label;
  const paneBody = pane?.body;
  const current: Shown | null = useMemo(
    () =>
      paneKey !== undefined
        ? { id: `pane:${paneKey}`, label: paneLabel ?? "", body: paneBody, ownHeader: true }
        : railItem,
    [paneKey, paneLabel, paneBody, railItem],
  );
  // The body lags the close by the slide-out, so the panel does not empty on
  // its way off.
  const [shown, setShown] = useState<Shown | null>(current);
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
    if (open && !railItem) setOpen(null);
  }, [open, railItem, setOpen]);

  const isOpen = current !== null;
  const panelRef = useFocusTrap<HTMLDivElement>(isOpen, shown?.id);
  useEffect(() => {
    panelRef.current?.toggleAttribute("inert", !isOpen);
  }, [isOpen, panelRef]);
  const layer = useOverlayLayer(isOpen);

  // The covered width, from the lane's edge to the panel's far side. Layout
  // offsets, not the box on screen: the slide-in's translate is not counted.
  // Zero as soon as the panel starts to close, so the views ease back with it.
  const setInset = useSetAtom(libraryRailInsetAtom);
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const layerEl = panel?.offsetParent as HTMLElement | null;
    const lane = panel?.closest<HTMLElement>('[data-part="lane-host"]');
    if (!fitContent || !isOpen || !panel || !layerEl || !lane) {
      setInset(NO_RAIL_INSET);
      return;
    }
    const measure = () => {
      const gutter = (layerEl.clientWidth - lane.clientWidth) / 2;
      const start = panel.offsetLeft - gutter;
      const end = start + panel.offsetWidth;
      const rtl = getComputedStyle(panel).direction === "rtl";
      setInset(
        rtl ? { left: Math.max(0, Math.round(end)), right: 0 } : { left: 0, right: Math.max(0, Math.round(lane.clientWidth - start)) },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(panel);
    ro.observe(lane);
    return () => ro.disconnect();
  }, [fitContent, isOpen, panelRef, setInset]);
  useEffect(() => () => setInset(NO_RAIL_INSET), [setInset]);
  const fit = fitContent || !!shown?.fit;
  const paneEscape = pane ? pane.onEscape : undefined;
  useEffect(() => {
    if (!isOpen || paneEscape === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || !layer.isTopNow()) return;
      if (paneEscape) {
        // In a record, Escape in a field or a menu is that control's.
        const t = e.target as HTMLElement | null;
        if (t?.closest("input, textarea, select, [role=menu], [role=listbox]")) return;
        if (document.querySelector('[aria-haspopup][aria-expanded="true"]')) return;
        e.preventDefault();
        paneEscape();
        return;
      }
      e.preventDefault();
      setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, layer, setOpen, paneEscape]);

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
              aria-label={
                disabled
                  ? `${item.label} (${item.disabledReason})`
                  : item.count !== undefined
                    ? `${item.label}, ${item.count} ${item.countNoun ?? ""}`.trimEnd()
                    : item.label
              }
              title={disabled ? item.disabledReason : item.label}
              aria-haspopup="dialog"
              aria-expanded={active}
              aria-controls={active ? panelId : undefined}
              aria-disabled={disabled || undefined}
              onClick={() => {
                if (disabled) return;
                if (pane) pane.close(() => setOpen(item.id));
                else setOpen(active ? null : item.id);
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
              {!!item.count && (
                <span
                  aria-hidden="true"
                  data-part="count"
                  className="absolute -bottom-1 -end-1 min-w-4 px-1 py-px rounded-md bg-paper border border-border text-meta leading-none font-medium tabular-nums text-ink"
                >
                  {item.count}
                </span>
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
        // A body with no height of its own (a document, a graph) marks itself
        // `data-panel-fill` and gets the lane's, as before.
        className={`absolute top-3 ${fit ? "max-h-[calc(100%-1.5rem)] has-[[data-panel-fill]]:bottom-3" : "bottom-3"} flex flex-col bg-paper border border-border rounded-lg shadow-lg overflow-hidden
          transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none ${
            isOpen ? "pointer-events-auto opacity-100 translate-x-0" : "pointer-events-none opacity-0 translate-x-2 rtl:-translate-x-2"
          }`}
        style={{
          insetInlineEnd: `calc(var(--gutter, 0px) + ${RAIL_RESERVE})`,
          width: `min(${PANEL_REM}rem, calc(100% - 2 * var(--gutter, 0px) - ${RAIL_RESERVE}))`,
          minHeight: fitContent ? `min(${PANEL_MIN_REM}rem, calc(100% - 1.5rem))` : undefined,
        }}
      >
        {shown &&
          (shown.ownHeader ? (
            <DrawerWidthProvider value={PANEL_REM * 16}>{shown.body}</DrawerWidthProvider>
          ) : (
            <div data-gutter-host className={`gutter-host flex flex-col min-h-0 ${fit ? "flex-1" : "h-full"}`}>
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
              <div className={`bleed flex-1 min-h-0 overflow-hidden ${fit ? "flex flex-col" : ""}`}>
                <DrawerWidthProvider value={PANEL_REM * 16}>{shown.body}</DrawerWidthProvider>
              </div>
            </div>
          ))}
      </div>
    </>
  );
}

/** What the panel shows: a rail item's body or the Library's own. */
interface Shown {
  id: string;
  label: string;
  body: ReactNode;
  ownHeader?: boolean;
  fit?: boolean;
}
