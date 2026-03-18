import { Link2, Copy, Highlighter } from "lucide-react";
import { useSetAtom } from "jotai";
import { entityPickerOpenAtom } from "../../atoms/selection";

interface FloatingMenuProps {
  x: number;
  y: number;
  text: string;
}

export function FloatingMenu({ x, y, text }: FloatingMenuProps) {
  const setEntityPickerOpen = useSetAtom(entityPickerOpenAtom);

  const handleCreateRef = () => {
    setEntityPickerOpen(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div
      className="fixed z-50 animate-fade-in-up"
      style={{
        left: x,
        top: y - 48,
        transform: "translateX(-50%)",
      }}
    >
      <div className="flex items-center gap-0.5 bg-ink rounded-md shadow-xl px-1 py-1">
        <button
          onClick={handleCreateRef}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white
            rounded-md hover:bg-white/15 transition-colors"
        >
          <Link2 size={14} />
          Create Reference
        </button>
        <div className="w-px h-4 bg-white/20" />
        <button
          onClick={handleCopy}
          className="p-1.5 text-white/70 rounded-md hover:bg-white/15 hover:text-white transition-colors"
          title="Copy text"
        >
          <Copy size={14} />
        </button>
        <button
          className="p-1.5 text-white/70 rounded-md hover:bg-white/15 hover:text-white transition-colors"
          title="Highlight"
        >
          <Highlighter size={14} />
        </button>
      </div>
    </div>
  );
}
