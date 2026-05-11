import { useAtom } from "jotai";
import { Rows3, LayoutList, CircleDot } from "lucide-react";
import { zoomAtom, type Zoom } from "../../atoms/filters";

const zoomOrder: Zoom[] = ["detail", "compact", "overview"];

const zoomOptions: { id: Zoom; icon: typeof LayoutList; label: string }[] = [
  { id: "detail", icon: LayoutList, label: "Detail" },
  { id: "compact", icon: Rows3, label: "Compact" },
  { id: "overview", icon: CircleDot, label: "Overview" },
];

/** Three-button density toggle. Used for the grouped + tree panel modes; the
 *  graph mode is now selected via PanelModeControls instead. */
export function ZoomControl() {
  const [zoom, setZoom] = useAtom(zoomAtom);

  const cycle = (delta: number) => {
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
      className="flex items-center rounded-md overflow-hidden h-8"
      style={{ border: "1px solid var(--border-primary)" }}
    >
      {zoomOptions.map((opt, i) => {
        const active = zoom === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            onClick={() => setZoom(opt.id)}
            aria-pressed={active}
            aria-label={opt.label}
            title={opt.label}
            className={`flex items-center justify-center h-8 px-2.5 transition-colors cursor-pointer ${
              active
                ? "bg-vellum text-ink"
                : "text-ink-tertiary hover:text-ink-secondary"
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
