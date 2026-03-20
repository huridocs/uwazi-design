import { Eye } from "lucide-react";
import type { CreatedEntity } from "../../data/imports";

interface EntitiesTableProps {
  entities: CreatedEntity[];
}

const cols = "1fr 10rem 5.625rem 2.75rem";

export function EntitiesTable({ entities }: EntitiesTableProps) {
  if (entities.length === 0) return null;

  return (
    <div
      className="flex flex-col flex-1 min-h-0 rounded-md overflow-hidden bg-paper"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="grid items-center gap-3 px-4 h-10 shrink-0 text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider"
        style={{
          gridTemplateColumns: cols,
          backgroundColor: "var(--bg-warm)",
          borderBottom: "1px solid var(--border-primary)",
        }}
      >
        <span>Title</span>
        <span>Template</span>
        <span>Created</span>
        <span className="text-center">View</span>
      </div>

      {/* Rows — fills available space, scrolls */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {entities.map((entity) => (
          <div
            key={entity.id}
            className="grid items-center gap-3 px-4 h-11 text-sm hover:bg-warm transition-colors"
            style={{
              gridTemplateColumns: cols,
              borderBottom: "1px solid var(--border-primary)",
            }}
          >
            <span className="text-xs font-medium text-ink truncate">{entity.title}</span>
            <span className="text-xs text-ink-tertiary">{entity.template}</span>
            <span className="text-xs text-ink-tertiary">
              {new Date(entity.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
            <button
              aria-label={`View ${entity.title}`}
              className="flex items-center justify-center p-1 rounded hover:bg-parchment transition-colors"
            >
              <Eye size={14} className="text-ink-tertiary" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex items-center px-4 h-10 shrink-0 text-xs text-ink-muted"
        style={{
          backgroundColor: "var(--bg-warm)",
          borderTop: "1px solid var(--border-primary)",
        }}
      >
        <span>{entities.length} entities shown</span>
      </div>
    </div>
  );
}
