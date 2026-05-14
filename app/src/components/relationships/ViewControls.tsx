import { useAtom } from "jotai";
import { LayoutList, ListTree, Network } from "lucide-react";
import { viewAtom, type View } from "../../atoms/filters";

const options: { id: View; label: string; icon: typeof LayoutList }[] = [
  { id: "list", label: "List", icon: LayoutList },
  { id: "tree", label: "Tree", icon: ListTree },
  { id: "graph", label: "Graph", icon: Network },
];

/** Presentation-mode toggle: list / tree / graph. Orthogonal to grouping. */
export function ViewControls({ size = "md" }: { size?: "sm" | "md" }) {
  const [view, setView] = useAtom(viewAtom);
  const h = size === "sm" ? "h-6" : "h-8";
  const iconSize = size === "sm" ? 11 : 12;

  return (
    <div
      role="group"
      aria-label="View"
      className={`flex items-center rounded-md overflow-hidden ${h}`}
      style={{ border: "1px solid var(--border-primary)" }}
    >
      {options.map((opt, i) => {
        const active = view === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setView(opt.id)}
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
