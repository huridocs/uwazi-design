import { Eye } from "lucide-react";
import type { CreatedEntity } from "../../data/imports";
import { useNotify } from "../../hooks/useNotify";
import { formatShortDate } from "../../utils/dates";

interface EntitiesTableProps {
  entities: CreatedEntity[];
}

const cols = "1fr 10rem 5.625rem 2.75rem";

export function EntitiesTable({ entities }: EntitiesTableProps) {
  const notify = useNotify();
  if (entities.length === 0) return null;

  return (
    <div
      data-component="EntitiesTable"
      className="flex flex-col flex-1 min-h-0 rounded-md overflow-hidden bg-paper"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      {/* A real table, re-displayed like DataTable's (roles restated for WebKit);
          the body is the scroll lane. */}
      <table role="table" className="flex flex-col flex-1 min-h-0 w-full">
        <caption className="sr-only">Created entities</caption>
        {/* Header */}
        <thead role="rowgroup" data-part="header" className="block shrink-0">
          <tr
            role="row"
            className="grid items-center gap-3 px-4 h-10 text-meta font-semibold text-ink-tertiary uppercase tracking-wider"
            style={{
              gridTemplateColumns: cols,
              backgroundColor: "var(--bg-warm)",
              borderBottom: "1px solid var(--border-primary)",
            }}
          >
            <th role="columnheader" scope="col" className="block font-semibold text-start">Title</th>
            <th role="columnheader" scope="col" className="block font-semibold text-start">Template</th>
            <th role="columnheader" scope="col" className="block font-semibold text-start">Created</th>
            <th role="columnheader" scope="col" className="block font-semibold text-center">View</th>
          </tr>
        </thead>

        {/* Rows — fills available space, scrolls */}
        <tbody role="rowgroup" data-part="rows" className="block flex-1 overflow-y-auto min-h-0">
          {entities.map((entity) => (
            <tr
              key={entity.id}
              role="row"
              data-part="row"
              className="grid items-center gap-3 px-4 h-11 text-sm hover:bg-warm transition-colors"
              style={{
                gridTemplateColumns: cols,
                borderBottom: "1px solid var(--border-primary)",
              }}
            >
              <td role="cell" className="block text-xs font-medium text-ink truncate">{entity.title}</td>
              <td role="cell" className="block text-xs text-ink-tertiary">{entity.template}</td>
              <td role="cell" className="block text-xs text-ink-tertiary">{formatShortDate(entity.date)}</td>
              <td role="cell" className="flex items-center justify-center">
                <button
                  type="button"
                  data-part="view"
                  aria-label={`View ${entity.title}`}
                  onClick={() => notify(`Opening ${entity.title}`)}
                  className="flex items-center justify-center p-1 rounded hover:bg-parchment transition-colors"
                >
                  <Eye size={14} className="text-ink-tertiary" aria-hidden />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div
        data-part="footer"
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
