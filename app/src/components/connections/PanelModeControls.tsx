import { useAtom } from "jotai";
import {
  LayoutList,
  Folders,
  Link2,
  ListTree,
  Network,
} from "lucide-react";
import { panelModeAtom, type PanelMode } from "../../atoms/filters";

const options: { id: PanelMode; label: string; icon: typeof LayoutList }[] = [
  { id: "list", label: "List", icon: LayoutList },
  { id: "by-entity-type", label: "By entity type", icon: Folders },
  { id: "by-relation-type", label: "By relation type", icon: Link2 },
  { id: "tree", label: "Tree", icon: ListTree },
  { id: "graph", label: "Graph", icon: Network },
];

/** Segmented 5-way pill that drives the merged Relationships panel. */
export function PanelModeControls({ size = "md" }: { size?: "sm" | "md" }) {
  const [mode, setMode] = useAtom(panelModeAtom);
  const h = size === "sm" ? "h-6" : "h-8";
  const iconSize = size === "sm" ? 11 : 12;

  return (
    <div
      role="group"
      aria-label="Panel view mode"
      className={`flex items-center rounded-md overflow-hidden ${h}`}
      style={{ border: "1px solid var(--border-primary)" }}
    >
      {options.map((opt, i) => {
        const active = mode === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setMode(opt.id)}
            aria-pressed={active}
            aria-label={opt.label}
            title={opt.label}
            className={`flex items-center justify-center ${h} px-2 transition-colors cursor-pointer ${
              active
                ? "bg-vellum text-ink"
                : "text-ink-tertiary hover:text-ink-secondary"
            }`}
            style={{
              borderLeft: i > 0 ? "1px solid var(--border-primary)" : "none",
            }}
          >
            <Icon size={iconSize} />
          </button>
        );
      })}
    </div>
  );
}
