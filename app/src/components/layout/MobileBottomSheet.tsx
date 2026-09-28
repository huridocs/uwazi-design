import { ReactNode, useEffect, useId, useLayoutEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useSheetLayer } from "../../hooks/useSheetLayer";
import { SHEET_STACK, sheetZ } from "../../atoms/sheetStack";

interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  defaultSnap?: "half" | "full";
  /** No header row: the content brings its own title and close (an entity
   *  preview). The back button of a stacked layer then rides the handle row. */
  bare?: boolean;
  /** Name for the dialog when `bare` (no visible title to label it). */
  ariaLabel?: string;
}

const SNAP_HALF_VH = 60;
const SNAP_FULL_VH = 92;

export function MobileBottomSheet({
  open,
  onClose,
  title,
  children,
  defaultSnap = "half",
  bare = false,
  ariaLabel,
}: MobileBottomSheetProps) {
  /* Its place on the phone's sheet stack (atoms/sheetStack). The first layer
     keeps its own height; while something is stacked on it, it rises so its top
     edge peeks above the next one. Every later layer is near full height, its
     top a stagger step below the layer under it. Only the top layer is live. */
  const layer = useSheetLayer(open);
  const stacked = layer.stacked && layer.count > 1;
  const live = open && layer.isTop;
  const [snap, setSnap] = useState<"half" | "full">(defaultSnap);
  /* The sheet is `role="dialog"` + `aria-modal`, so it traps focus while open
     and gives it back to whatever opened it (the navbar hamburger, a split
     view's sheet trigger). The same ref drives the drag transform below. */
  const sheetRef = useFocusTrap<HTMLDivElement>(open);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(0);
  const titleId = useId();

  /* A CLOSED sheet stays mounted, pushed below the viewport by translateY, so
     without `inert` Tab walks into controls nobody can see — the FiltersDrawer
     defect, again. A layout effect, so the attribute is gone before the focus
     trap's effect looks for something to focus. */
  useLayoutEffect(() => {
    sheetRef.current?.toggleAttribute("inert", !live);
  }, [live, sheetRef]);

  // Reset snap point when reopened
  useEffect(() => {
    if (open) setSnap(defaultSnap);
  }, [open, defaultSnap]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC closes the TOP layer only: one press, one layer.
  useEffect(() => {
    if (!live) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [live, onClose]);

  // Drag handlers for the handle
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    dragStartHeight.current = snap === "full" ? SNAP_FULL_VH : SNAP_HALF_VH;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const dy = e.clientY - dragStartY.current;
    if (Math.abs(dy) < 8) return;
    // Translate sheet visually during drag
    if (sheetRef.current) {
      sheetRef.current.style.transition = "none";
      sheetRef.current.style.transform = `translateY(${Math.max(0, dy)}px)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const dy = e.clientY - dragStartY.current;
    dragStartY.current = null;
    if (sheetRef.current) {
      sheetRef.current.style.transition = "";
      sheetRef.current.style.transform = "";
    }
    // Decide what to do based on drag distance. A stacked layer above the
    // first has one height, so a drag down pops it.
    if (dy > 120) {
      if (snap === "full" && layer.index <= 0) setSnap("half");
      else onClose();
    } else if (dy < -60 && snap === "half" && layer.index <= 0) {
      setSnap("full");
    }
  };

  const snapVh = snap === "full" ? SNAP_FULL_VH : SNAP_HALF_VH;
  const off = layer.offsetRem;
  // Depth below the top, capped at the staggered layers: scale and dim grow
  // with it so depth reads at a glance.
  const depth = Math.min(layer.depth, SHEET_STACK.visible - 1);
  const height = stacked && layer.index > 0 ? `calc(100dvh - ${off}rem)` : `${snapVh}dvh`;
  const lift = stacked && layer.index === 0 ? `translateY(calc(${off}rem - ${100 - snapVh}dvh))` : "translateY(0)";
  const transform = open
    ? `${lift} scale(${1 - SHEET_STACK.scaleStep * depth})`
    : "translateY(100%)";
  const back = open && layer.index > 0 && (
    <button
      type="button"
      onClick={onClose}
      data-part="back"
      aria-label="Back"
      className="p-1 rounded-md hover:bg-warm text-ink-muted hover:text-ink transition-colors cursor-pointer"
    >
      <ArrowLeft size={16} aria-hidden className="rtl:rotate-180" />
    </button>
  );

  /* Portalled to the body. A sheet opened from inside another sheet would
     otherwise be that sheet's DOM descendant: inside its `inert` (so the new top
     layer took no input) and inside its scale transform, which makes
     `position: fixed` resolve against the lower sheet instead of the screen.
     Context still flows through the portal. */
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        data-component="MobileBottomSheet"
        data-part="backdrop"
        className="fixed inset-0 transition-opacity duration-200 motion-reduce:transition-none"
        style={{
          backgroundColor: "color-mix(in srgb, var(--text-primary) 30%, transparent)",
          // One scrim for the stack: the first layer's. The ones above it are
          // clear, but still take the tap that closes their own layer.
          opacity: open && layer.index <= 0 ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          zIndex: sheetZ(Math.max(0, layer.index)),
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title && !bare ? titleId : undefined}
        aria-label={bare ? ariaLabel : undefined}
        data-component="MobileBottomSheet"
        data-part="sheet"
        data-snap={snap}
        data-layer={layer.index}
        className="fixed left-0 right-0 bottom-0 flex flex-col bg-paper transition-[transform,height] duration-250 ease-out motion-reduce:transition-none"
        style={{
          height,
          transform,
          transformOrigin: "top center",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          boxShadow: "0 -8px 24px rgba(0,0,0,0.15)",
          zIndex: sheetZ(Math.max(0, layer.index)) + 1,
          paddingBottom: "env(safe-area-inset-bottom, 0)",
        }}
      >
        {/* The dim that says "under another layer". Drawn over the content,
            never taking a tap: the layer is inert while it shows. */}
        <div
          aria-hidden
          data-part="dim"
          className="absolute inset-0 pointer-events-none transition-opacity duration-250 motion-reduce:transition-none"
          style={{
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            backgroundColor: "color-mix(in srgb, var(--text-primary) 8%, transparent)",
            opacity: open ? Math.min(layer.depth, 3) / 2 : 0,
            zIndex: 1,
          }}
        />
        {/* Drag handle */}
        <div
          data-part="handle"
          className="relative flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div
            className="rounded-full w-9 h-1"
            style={{ backgroundColor: "var(--border-soft)" }}
          />
          {bare && back && (
            <span className="absolute start-2 top-0.5" onPointerDown={(e) => e.stopPropagation()}>
              {back}
            </span>
          )}
        </div>

        {/* Header */}
        {!bare && (
          <div
            data-part="header"
            className="flex items-center justify-between gap-2 px-4 py-2 shrink-0"
            style={{ borderBottom: "1px solid var(--border-primary)" }}
          >
            {back}
            <h2 id={titleId} data-part="title" className="flex-1 min-w-0 truncate text-sm font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              data-part="close"
              className="p-1 rounded-md hover:bg-warm text-ink-muted hover:text-ink transition-colors"
              aria-label="Close"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        )}

        {/* Content */}
        <div data-part="body" className="flex-1 min-h-0 overflow-auto" style={{ overscrollBehavior: "contain" }}>
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
