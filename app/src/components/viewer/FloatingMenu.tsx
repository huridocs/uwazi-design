import { Link2, Copy, Highlighter, TextCursorInput } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { entityPickerOpenAtom, textSelectionAtom } from "../../atoms/selection";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { highlightsAtom, HIGHLIGHT_COLOR } from "../../atoms/highlights";
import { fillTargetAtom, fillRequestAtom } from "../../atoms/fillTarget";
import { t } from "../../utils/i18n";
import { toastsAtom } from "../../atoms/notifications";

interface FloatingMenuProps {
  x: number;
  y: number;
  /** The selection's bottom edge: where the menu goes on a touch screen. */
  yBelow?: number;
  text: string;
}

export function FloatingMenu({ x, y, yBelow, text }: FloatingMenuProps) {
  const setEntityPickerOpen = useSetAtom(entityPickerOpenAtom);
  const selection = useAtomValue(textSelectionAtom);
  const focusedEntityId = useAtomValue(focusedEntityIdAtom);
  const setHighlights = useSetAtom(highlightsAtom);
  const setSelection = useSetAtom(textSelectionAtom);
  const setToasts = useSetAtom(toastsAtom);
  const fillTarget = useAtomValue(fillTargetAtom);
  const sendFill = useSetAtom(fillRequestAtom);

  const handleCreateRef = () => {
    setEntityPickerOpen(true);
  };

  /** Commit the selection into the armed field. A click, not the selection
   *  itself: filling on selection would overwrite a field every time the user
   *  selects text to read it. */
  const handleFill = () => {
    sendFill(text);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  const handleHighlight = () => {
    if (!selection || selection.rects.length === 0) return;
    setHighlights((prev) => [
      ...prev,
      {
        id: `hl-${Date.now()}`,
        entityId: focusedEntityId,
        text: selection.text,
        page: selection.page,
        rects: selection.rects,
        color: HIGHLIGHT_COLOR,
        createdAt: new Date().toISOString().split("T")[0],
      },
    ]);
    setToasts((prev) => [
      ...prev,
      { id: Date.now().toString(), message: t("System", "Highlight added"), type: "success" as const },
    ]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  /* Touch (a coarse pointer): below the selection. Above it is where iOS
     draws its own copy / look-up callout, so the two covered each other
     (M22). 24px clears the selection handles; clamped above the on-screen
     keyboard and the screen's foot. Fine pointers keep the menu above. */
  const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  const top =
    touch && yBelow !== undefined
      ? Math.min(yBelow + 24, window.innerHeight - 56 - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--kb")) || 0))
      : Math.max(8, y - 48);

  // Clamp horizontally so the menu doesn't escape the viewport
  const clampedX = typeof window !== "undefined"
    ? Math.min(Math.max(x, 110), window.innerWidth - 110)
    : x;

  return (
    <div
      data-component="FloatingMenu"
      data-state={fillTarget ? "filling" : undefined}
      className="fixed z-50 animate-fade-in-up"
      style={{
        left: clampedX,
        top,
        transform: "translateX(-50%)",
      }}
    >
      <div
        data-part="actions"
        role="group"
        aria-label={t("System", "Selection actions")}
        className="flex items-center gap-0.5 rounded-md shadow-xl px-1 py-1" style={{ backgroundColor: "#1A1A1A" }}>
        {/* While a field is armed, Fill comes first; "Create relationship" stays
            after it. The button names the field, because the form is out of
            sight from inside the document. */}
        {fillTarget && (
          <>
            <button
              type="button"
              data-part="fill"
              onClick={handleFill}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white
                whitespace-nowrap rounded-md hover:bg-white/15 transition-colors"
            >
              <TextCursorInput size={14} aria-hidden />
              {t("System", "Fill")} {fillTarget.label}
            </button>
            <div className="w-px h-4 bg-white/20" aria-hidden="true" />
          </>
        )}
        <button
          type="button"
          data-part="create-relationship"
          onClick={handleCreateRef}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white
            whitespace-nowrap rounded-md hover:bg-white/15 transition-colors"
        >
          <Link2 size={14} aria-hidden />
          {t("System", "Create relationship")}
        </button>
        <div className="w-px h-4 bg-white/20" aria-hidden="true" />
        <button
          type="button"
          data-part="copy"
          onClick={handleCopy}
          className="p-1.5 text-white/70 rounded-md hover:bg-white/15 hover:text-white transition-colors"
          aria-label={t("System", "Copy text")}
        >
          <Copy size={14} aria-hidden />
        </button>
        <button
          type="button"
          data-part="highlight"
          onClick={handleHighlight}
          className="p-1.5 text-white/70 rounded-md hover:bg-white/15 hover:text-white transition-colors"
          aria-label={t("System", "Highlight text")}
        >
          <Highlighter size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
