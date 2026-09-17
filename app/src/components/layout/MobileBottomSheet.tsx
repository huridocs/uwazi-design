import { ReactNode, useEffect, useId, useLayoutEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  defaultSnap?: "half" | "full";
}

const SNAP_HALF_VH = 60;
const SNAP_FULL_VH = 92;

export function MobileBottomSheet({
  open,
  onClose,
  title,
  children,
  defaultSnap = "half",
}: MobileBottomSheetProps) {
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
    sheetRef.current?.toggleAttribute("inert", !open);
  }, [open, sheetRef]);

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

  // ESC key to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
    // Decide what to do based on drag distance
    if (dy > 120) {
      // Dragged down significantly: close or collapse
      if (snap === "full") setSnap("half");
      else onClose();
    } else if (dy < -60 && snap === "half") {
      setSnap("full");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        data-component="MobileBottomSheet"
        data-part="backdrop"
        className="fixed inset-0 transition-opacity duration-200"
        style={{
          backgroundColor: "color-mix(in srgb, var(--text-primary) 30%, transparent)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          zIndex: 70,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        data-component="MobileBottomSheet"
        data-part="sheet"
        data-snap={snap}
        className="fixed left-0 right-0 bottom-0 flex flex-col bg-paper transition-transform duration-250 ease-out"
        style={{
          height: `${snap === "full" ? SNAP_FULL_VH : SNAP_HALF_VH}vh`,
          transform: open ? "translateY(0)" : "translateY(100%)",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          boxShadow: "0 -8px 24px rgba(0,0,0,0.15)",
          zIndex: 71,
          paddingBottom: "env(safe-area-inset-bottom, 0)",
        }}
      >
        {/* Drag handle */}
        <div
          data-part="handle"
          className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div
            className="rounded-full w-9 h-1"
            style={{ backgroundColor: "var(--border-soft)" }}
          />
        </div>

        {/* Header */}
        {(title || true) && (
          <div
            data-part="header"
            className="flex items-center justify-between px-4 py-2 shrink-0"
            style={{ borderBottom: "1px solid var(--border-primary)" }}
          >
            <h2 id={titleId} data-part="title" className="text-sm font-semibold text-ink">{title}</h2>
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
    </>
  );
}
