import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import type { EntityType } from "../../data/entities";
import { useFocusTrap } from "../../hooks/useFocusTrap";

/** Create entity, step one: which template. The new entity then opens in the
 *  Library drawer on its edit form (`startDraftAtom`), because a template is
 *  the one thing the form can't ask for — it decides which fields there are.
 *
 *  Lists the ACTIVE corpus's templates, in their own order, with a search box
 *  for the corpora that have many (CEJIL has nineteen). Portalled and fixed:
 *  the Library pane is `overflow-hidden`. Traps focus, closes on Escape or a
 *  click on the scrim. */
export function CreateEntityDialog({
  types,
  defaultTypeId,
  onChoose,
  onClose,
}: {
  types: EntityType[];
  /** The corpus's default template, listed first and tagged. */
  defaultTypeId?: string;
  onChoose: (typeId: string) => void;
  onClose: () => void;
}) {
  const panelRef = useFocusTrap<HTMLDivElement>(true);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matching = q ? types.filter((t) => t.name.toLowerCase().includes(q)) : types;
    const def = matching.find((t) => t.id === defaultTypeId);
    return def ? [def, ...matching.filter((t) => t !== def)] : matching;
  }, [types, query, defaultTypeId]);

  return createPortal(
    <div
      data-component="CreateEntityDialog"
      data-part="scrim"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-entity-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        className="w-full max-w-[24rem] h-[min(28rem,100%)] flex flex-col bg-paper rounded-lg border border-border shadow-lg overflow-hidden"
      >
        <header className="shrink-0 flex items-center gap-2 h-11 px-3 border-b border-border">
          <h2 id="create-entity-title" className="text-xs font-semibold text-ink">
            Create entity
          </h2>
          <span className="text-meta text-ink-tertiary">choose a template</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ms-auto p-1 rounded-md text-ink-muted hover:bg-warm hover:text-ink cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
          >
            <X size={14} />
          </button>
        </header>
        <div className="shrink-0 px-3 py-2 border-b border-border">
          <div className="flex items-center gap-1.5 h-8 px-2 bg-warm rounded-md">
            <Search size={13} className="text-ink-muted shrink-0" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates"
              aria-label="Search templates"
              autoFocus
              className="flex-1 min-w-0 bg-transparent text-xs text-ink placeholder:text-ink-muted focus:outline-none"
            />
          </div>
        </div>
        <ul className="flex-1 overflow-auto py-1">
          {shown.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-ink-muted">No template matches that name.</li>
          )}
          {shown.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onChoose(t.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-start text-xs text-ink hover:bg-parchment
                  cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset
                  focus-visible:ring-carbon/40"
              >
                <span
                  aria-hidden
                  className="w-2 h-2 rounded-[2px] shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                {t.name}
                {t.id === defaultTypeId && (
                  <span className="ms-auto text-meta text-ink-tertiary">Default</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
