import { useAtom } from "jotai";
import { Rows3, LayoutList, CircleDot } from "lucide-react";
import { zoomAtom, type Zoom } from "../../atoms/filters";

const zoomOrder: Zoom[] = ["detail", "compact", "overview"];

const zoomOptions: { id: Zoom; icon: typeof LayoutList; label: string }[] = [
  { id: "detail", icon: LayoutList, label: "Detail" },
  { id: "compact", icon: Rows3, label: "Compact" },
  { id: "overview", icon: CircleDot, label: "Overview" },
];

interface Props {
  /** When true, render the control inert (greyed out). Used in list view
   *  without grouping and in graph view to keep the toolbar layout stable. */
  disabled?: boolean;
}

/** Three-button density toggle. Used for the tree view and grouped list view;
 *  the view itself is now selected via ViewControls. */
export function ZoomControl({ disabled = false }: Props = {}) {
  const [zoom, setZoom] = useAtom(zoomAtom);

  const cycle = (delta: number) => {
    if (disabled) return;
    const i = zoomOrder.indexOf(zoom);
    const next = zoomOrder[(i + delta + zoomOrder.length) % zoomOrder.length];
    setZoom(next);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      cycle(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      cycle(1);
    }
  };

  return (
    <div
      role="group"
      aria-label="Row density"
      onKeyDown={onKeyDown}
      aria-disabled={disabled}
      className={`flex items-center rounded-md overflow-hidden h-8 ${
        disabled ? "opacity-60" : ""
      }`}
      style={{ border: "1px solid var(--border-primary)" }}
    >
      {zoomOptions.map((opt, i) => {
        const active = zoom === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => !disabled && setZoom(opt.id)}
            aria-pressed={active}
            aria-label={opt.label}
            title={opt.label}
            disabled={disabled}
            className={`flex items-center justify-center h-8 px-2.5 transition-colors ${
              disabled
                ? "text-ink-muted cursor-not-allowed"
                : active
                  ? "bg-vellum text-ink cursor-pointer"
                  : "text-ink-tertiary hover:text-ink-secondary cursor-pointer"
            }`}
            style={{ borderLeft: i > 0 ? "1px solid var(--border-primary)" : "none" }}
          >
            <Icon size={12} />
          </button>
        );
      })}
    </div>
  );
}
