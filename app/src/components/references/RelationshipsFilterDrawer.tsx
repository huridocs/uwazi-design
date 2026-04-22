import { useMemo } from "react";
import { useAtom } from "jotai";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { referencesAtom } from "../../atoms/references";
import { relationshipTypeFiltersAtom, relationshipEntityTypeFiltersAtom } from "../../atoms/filters";
import { getEntity, getEntityType } from "../../data/entities";
import { relationTypes } from "../../data/references";
import { currentDocument } from "../../data/document";
import { EntityPill } from "../shared/EntityPill";

export function RelationshipsFilterDrawer() {
  const [references] = useAtom(referencesAtom);
  const [relTypeFilters, setRelTypeFilters] = useAtom(relationshipTypeFiltersAtom);
  const [entityTypeFilters, setEntityTypeFilters] = useAtom(relationshipEntityTypeFiltersAtom);

  const { byRelType, byEntityType, totalRels } = useMemo(() => {
    const rel = new Map<string, number>();
    const ent = new Map<string, number>();
    for (const ref of references) {
      rel.set(ref.relationType, (rel.get(ref.relationType) ?? 0) + 1);
      const entity = getEntity(ref.targetEntityId);
      const typeId = entity?.typeId ?? "unknown";
      ent.set(typeId, (ent.get(typeId) ?? 0) + 1);
    }
    return { byRelType: rel, byEntityType: ent, totalRels: references.length };
  }, [references]);

  const sourceType = getEntityType(currentDocument.entityTypeId);

  const anyFilterActive =
    Object.values(relTypeFilters).some(Boolean) ||
    Object.values(entityTypeFilters).some(Boolean);

  const clearAll = () => {
    setRelTypeFilters({});
    setEntityTypeFilters({});
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-paper">
      {/* Header: source entity summary */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        <div className="text-[13px] font-semibold text-ink leading-snug mb-2 line-clamp-3">
          {currentDocument.title}
        </div>
        <EntityPill typeId={currentDocument.entityTypeId} label={sourceType?.name} />
      </div>

      <div className="flex-1 overflow-auto">
        {/* Relation types */}
        <FacetSection
          title="Relation type"
          total={totalRels}
          entries={Array.from(byRelType.entries()).sort((a, b) => b[1] - a[1])}
          selected={relTypeFilters}
          onToggle={(id) =>
            setRelTypeFilters((s) => ({ ...s, [id]: !s[id] }))
          }
          label={(id) =>
            relationTypes.find((r) => r.id === id)?.label ?? id
          }
          defaultExpanded
        />

        {/* Target entity types */}
        <FacetSection
          title="Target entity type"
          total={totalRels}
          entries={Array.from(byEntityType.entries()).sort((a, b) => b[1] - a[1])}
          selected={entityTypeFilters}
          onToggle={(id) =>
            setEntityTypeFilters((s) => ({ ...s, [id]: !s[id] }))
          }
          label={(id) => getEntityType(id)?.name ?? id}
          renderMarker={(id) => {
            const t = getEntityType(id);
            return t ? (
              <span
                className="rounded-[2px] shrink-0"
                style={{
                  backgroundColor: t.color,
                  width: 6, height: 6,
                }}
              />
            ) : null;
          }}
        />
      </div>

      {anyFilterActive && (
        <div
          className="px-4 py-2 shrink-0"
          style={{ borderTop: "1px solid var(--border-primary)" }}
        >
          <button
            onClick={clearAll}
            className="text-[11px] font-medium text-ink-secondary hover:text-ink transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

interface FacetSectionProps {
  title: string;
  total: number;
  entries: [string, number][];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  label: (id: string) => string;
  renderMarker?: (id: string) => React.ReactNode;
  defaultExpanded?: boolean;
}

function FacetSection({
  title,
  total,
  entries,
  selected,
  onToggle,
  label,
  renderMarker,
  defaultExpanded = true,
}: FacetSectionProps) {
  const [open, setOpen] = useState(defaultExpanded);
  const activeCount = entries.reduce((sum, [id, c]) => sum + (selected[id] ? c : 0), 0);

  return (
    <div style={{ borderBottom: "1px solid var(--border-soft)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-warm transition-colors"
      >
        <ChevronDown
          size={12}
          className={`text-ink-tertiary shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
        />
        <span className="text-xs font-semibold text-ink-secondary">{title}</span>
        <span className="ml-auto text-[11px] text-ink-tertiary tabular-nums">
          {activeCount > 0 ? `${activeCount}/${total}` : total}
        </span>
      </button>
      {open && (
        <div className="pb-2">
          {entries.map(([id, count]) => {
            const checked = !!selected[id];
            return (
              <label
                key={id}
                className="flex items-center gap-2 px-4 py-1.5 cursor-pointer hover:bg-warm transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(id)}
                  className="shrink-0 cursor-pointer"
                  style={{ width: 12, height: 12 }}
                />
                {renderMarker?.(id)}
                <span className="text-xs text-ink-secondary truncate flex-1">
                  {label(id)}
                </span>
                <span className="text-[11px] text-ink-tertiary tabular-nums shrink-0">
                  {count}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
