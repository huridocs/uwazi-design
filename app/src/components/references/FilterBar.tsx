import { useAtom } from "jotai";
import { viewModeAtom, ViewMode } from "../../atoms/filters";
import { SegmentedTabs } from "../layout/SegmentedTabs";
import { referencesAtom } from "../../atoms/references";

const viewTabs: { id: ViewMode; label: string }[] = [
  { id: "all", label: "All" },
  { id: "by-entity-type", label: "By Entity" },
  { id: "by-relation-type", label: "By Relation" },
  { id: "density", label: "Density" },
];

export function FilterBar() {
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const [references] = useAtom(referencesAtom);

  const tabs = viewTabs.map((t) => ({
    ...t,
    count: t.id === "all" ? references.length : undefined,
  }));

  return (
    <div className="px-3 py-2">
      <SegmentedTabs
        tabs={tabs}
        activeId={viewMode}
        onChange={(id) => setViewMode(id as ViewMode)}
      />
    </div>
  );
}
