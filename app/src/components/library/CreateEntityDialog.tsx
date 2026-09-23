import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { EntityType } from "../../data/entities";
import { Modal } from "../shared/Modal";

/** Create entity, step one: which template. The new entity then opens in the
 *  Library drawer on its edit form (`startDraftAtom`), because a template is
 *  the one thing the form can't ask for — it decides which fields there are.
 *
 *  Lists the ACTIVE corpus's templates, in their own order, with a search box
 *  for the corpora that have many (CEJIL has nineteen). The shared `Modal`
 *  (portalled: the Library pane is `overflow-hidden`). */
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
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matching = q ? types.filter((t) => t.name.toLowerCase().includes(q)) : types;
    const def = matching.find((t) => t.id === defaultTypeId);
    return def ? [def, ...matching.filter((t) => t !== def)] : matching;
  }, [types, query, defaultTypeId]);

  return (
    <Modal
      component="CreateEntityDialog"
      size="sm"
      height="md:h-[min(28rem,100%)] h-[min(28rem,100%)]"
      onClose={onClose}
      title="Create entity"
      titleId="create-entity-title"
      subtitle="choose a template"
      flush
    >
      <div className="bleed shrink-0 py-2 border-b border-border">
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
      <ul className="bleed-flush flex-1 overflow-auto py-1">
        {shown.length === 0 && (
          <li className="py-6 text-center text-xs text-ink-muted">No template matches that name.</li>
        )}
        {shown.map((t) => (
          <li key={t.id} className="flex flex-col">
            <button
              type="button"
              onClick={() => onChoose(t.id)}
              className="bleed flex items-center gap-2 py-2 text-start text-xs text-ink hover:bg-parchment
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
    </Modal>
  );
}
