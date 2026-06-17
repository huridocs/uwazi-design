import { Link2, Copy, Highlighter } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { entityPickerOpenAtom, textSelectionAtom } from "../../atoms/selection";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { highlightsAtom, HIGHLIGHT_COLOR } from "../../atoms/highlights";
import { toastsAtom } from "../../atoms/references";
import { t } from "../../utils/i18n";

interface FloatingMenuProps {
  x: number;
  y: number;
  text: string;
}

export function FloatingMenu({ x, y, text }: FloatingMenuProps) {
  const setEntityPickerOpen = useSetAtom(entityPickerOpenAtom);
  const selection = useAtomValue(textSelectionAtom);
  const focusedEntityId = useAtomValue(focusedEntityIdAtom);
  const setHighlights = useSetAtom(highlightsAtom);
  const setSelection = useSetAtom(textSelectionAtom);
  const setToasts = useSetAtom(toastsAtom);

  const handleCreateRef = () => {
    setEntityPickerOpen(true);
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

  // Clamp horizontally so the menu doesn't escape the viewport
  const clampedX = typeof window !== "undefined"
    ? Math.min(Math.max(x, 110), window.innerWidth - 110)
    : x;

  return (
    <div
      className="fixed z-50 animate-fade-in-up"
      style={{
        left: clampedX,
        top: Math.max(8, y - 48),
        transform: "translateX(-50%)",
      }}
    >
      <div className="flex items-center gap-0.5 rounded-md shadow-xl px-1 py-1" style={{ backgroundColor: "#1A1A1A" }}>
        <button
          onClick={handleCreateRef}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white
            rounded-md hover:bg-white/15 transition-colors"
        >
          <Link2 size={14} />
          {t("System", "Create relationship")}
        </button>
        <div className="w-px h-4 bg-white/20" aria-hidden="true" />
        <button
          onClick={handleCopy}
          className="p-1.5 text-white/70 rounded-md hover:bg-white/15 hover:text-white transition-colors"
          aria-label={t("System", "Copy text")}
        >
          <Copy size={14} />
        </button>
        <button
          onClick={handleHighlight}
          className="p-1.5 text-white/70 rounded-md hover:bg-white/15 hover:text-white transition-colors"
          aria-label={t("System", "Highlight text")}
        >
          <Highlighter size={14} />
        </button>
      </div>
    </div>
  );
}
