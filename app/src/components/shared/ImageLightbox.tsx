import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { EntityImage } from "../../data/entities";
import { useFocusTrap } from "../../hooks/useFocusTrap";

/** One image at its own size, over everything.
 *
 *  A record card shows a picture at the width of a drawer, matted and capped at
 *  22rem — enough to know WHICH picture it is and not enough to look at it. This
 *  is the looking, and it is the only place in the app that shows an asset at
 *  its full resolution.
 *
 *  It portals to `document.body` on purpose: the record it opens from is inside
 *  an `overflow-hidden` pane (the drawer, the preview overlay), and an
 *  `absolute inset-0` overlay there would be clipped to the pane rather than
 *  covering the screen — the same reason `FiltersDrawer` grew a host portal.
 *
 *  The image is `object-contain` inside the viewport, never scaled UP: a 607px
 *  painting blown to 1600 is a blurrier picture than the one you clicked, and
 *  "full size" means the asset's size, not the screen's. */
export function ImageLightbox({
  image,
  onClose,
}: {
  image: EntityImage | null;
  onClose: () => void;
}) {
  const trapRef = useFocusTrap<HTMLDivElement>(!!image);

  useEffect(() => {
    if (!image) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [image, onClose]);

  if (!image) return null;

  return createPortal(
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label={image.alt}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in-up"
      style={{ backgroundColor: "var(--bg-overlay)" }}
    >
      <img
        src={image.url}
        alt={image.alt}
        // Clicking the picture itself must not close what you opened to look at.
        onClick={(e) => e.stopPropagation()}
        className="rounded shadow-lg"
        style={{
          maxWidth: `min(100%, ${image.width}px)`,
          maxHeight: `min(100%, ${image.height}px)`,
          objectFit: "contain",
        }}
      />
      {/* The filename, because this is also where you confirm WHICH file this
          is — the same name the Library card printed to get you here. */}
      {image.filename && (
        <span className="fixed bottom-4 start-1/2 -translate-x-1/2 rounded-md bg-ink/70 px-2 py-1 text-meta text-paper">
          {image.filename}
        </span>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image"
        className="fixed top-4 end-4 flex items-center justify-center w-8 h-8 rounded-md bg-ink/60 text-paper hover:bg-ink/80 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-paper/60"
      >
        <X size={16} />
      </button>
    </div>,
    document.body,
  );
}
