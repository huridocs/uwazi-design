import { useRelAtom } from "../../hooks/useEntityScope";
import { CalendarRange, LayoutList, ListTree, Network } from "lucide-react";
import { viewAtom, type View } from "../../atoms/filters";
import { SegmentedControl, type Segment } from "../shared/SegmentedControl";

const options: Segment[] = [
  { id: "list", label: "List", icon: LayoutList },
  { id: "tree", label: "Tree", icon: ListTree },
  { id: "graph", label: "Graph", icon: Network },
  { id: "when", label: "When", icon: CalendarRange },
];

/** Presentation-mode toggle: list / tree / graph / when. Orthogonal to grouping. */
export function ViewControls({ size = "md" }: { size?: "sm" | "md" }) {
  const [view, setView] = useRelAtom(viewAtom);
  return (
    <SegmentedControl
      ariaLabel="View"
      size={size}
      value={view}
      options={options}
      onChange={(id) => setView(id as View)}
    />
  );
}
