import { useAtom } from "jotai";
import { Rows3, LayoutList, CircleDot, Network } from "lucide-react";
import {
  relationshipsZoomAtom,
  relationshipsViewModeAtom,
  type RelationshipsZoom,
  type RelationshipsViewMode,
} from "../../atoms/filters";

const zoomOrder: RelationshipsZoom[] = ["detail", "compact", "overview"];

const zoomOptions: { id: RelationshipsZoom; icon: typeof LayoutList; label: string }[] = [
  { id: "detail", icon: LayoutList, label: "Detail" },
  { id: "compact", icon: Rows3, label: "Compact" },
  { id: "overview", icon: CircleDot, label: "Overview" },
];

export function ZoomControl() {
  const [zoom, setZoom] = useAtom(relationshipsZoomAtom);
  const [viewMode, setViewMode] = useAtom(relationshipsViewModeAtom);

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

  const toggleGraph = () => {
    setViewMode((m: RelationshipsViewMode) => (m === "graph" ? "tree" : "graph"));
  };

  const graphActive = viewMode === "graph";

  return (
    <div
      role="group"
      aria-label="Relationships view controls"
      onKeyDown={onKeyDown}
      className="flex items-center rounded-md overflow-hidden h-8"
      style={{ border: "1px solid var(--border-primary)" }}
    >
      {zoomOptions.map((opt, i) => {
        const isActive = !graphActive && zoom === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            onClick={() => {
              if (graphActive) setViewMode("tree");
              setZoom(opt.id);
            }}
            aria-pressed={isActive}
            aria-label={opt.label}
            title={opt.label}
            className={`flex items-center justify-center h-8 px-2.5 transition-colors cursor-pointer ${
              isActive
                ? "bg-vellum text-ink"
                : "text-ink-tertiary hover:text-ink-secondary"
            }`}
            style={{ borderLeft: i > 0 ? "1px solid var(--border-primary)" : "none" }}
          >
            <Icon size={12} />
          </button>
        );
      })}
      <button
        onClick={toggleGraph}
        aria-pressed={graphActive}
        aria-label="Graph view"
        title="Graph view"
        className={`flex items-center justify-center h-8 px-2.5 transition-colors cursor-pointer ${
          graphActive
            ? "bg-vellum text-ink"
            : "text-ink-tertiary hover:text-ink-secondary"
        }`}
        style={{ borderLeft: "1px solid var(--border-primary)" }}
      >
        <Network size={12} />
      </button>
    </div>
  );
}
