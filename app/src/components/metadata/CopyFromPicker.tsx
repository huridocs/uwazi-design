import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { Search, X } from "lucide-react";
import { libraryEntitiesAtom } from "../../atoms/dataSource";
import { languageAtom } from "../../atoms/language";
import { getEntityType, type Entity } from "../../data/entities";
import { buildCopyIndex, countCopyMatchesFor, entityCopyFields } from "../../utils/copyFrom";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { EntityPill } from "../shared/EntityPill";
import { CountBadge } from "../shared/CountBadge";
import { SegmentedControl } from "../shared/SegmentedControl";

/** How many candidates are scored and listed. The badge costs one map lookup per
 *  source field (see `countCopyMatches`), but obtaining those fields builds a
 *  profile, so the corpus is not scored end to end for a picker nobody has
 *  scrolled. */
const LIMIT = 40;

/** Pick the entity to copy metadata FROM.
 *
 *  Two things here answer Uwazi directly (research §"Critical assessment"):
 *
 *  · It defaults to the target's OWN type. Theirs searches the whole library by
 *    title with no filter, so editors routinely pick a source sharing zero
 *    properties and only find out after selecting it (#2). Defaulting to the
 *    type that by construction shares a schema makes the common case the easy
 *    one — with "Any type" right there, because copying across types is a real
 *    thing to want and their version's one virtue.
 *
 *  · Every candidate is badged with how many fields it would actually bring
 *    across, before it is chosen (#6). A source with nothing to give says so in
 *    the list rather than after two clicks and an empty preview. */
export function CopyFromPicker({
  target,
  onPreview,
  onClose,
}: {
  target: Entity;
  /** A candidate was chosen — the caller opens the preview. */
  onPreview: (source: Entity) => void;
  onClose: () => void;
}) {
  const entities = useAtomValue(libraryEntitiesAtom);
  const language = useAtomValue(languageAtom);
  const [scope, setScope] = useState<"type" | "any">("type");
  const [query, setQuery] = useState("");
  const panelRef = useFocusTrap<HTMLDivElement>(true);
  const typeName = getEntityType(target.typeId)?.name ?? "this type";

  // Built once per target, then one lookup per candidate field — the whole
  // reason the matching layer exposes an index rather than only `planCopy`.
  const index = useMemo(
    () => buildCopyIndex(entityCopyFields(target, language)),
    [target, language],
  );

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entities
      .filter((e) => e.id !== target.id)
      .filter((e) => (scope === "type" ? e.typeId === target.typeId : true))
      .filter((e) => (q ? e.title.toLowerCase().includes(q) : true))
      .slice(0, LIMIT)
      .map((e) => ({ entity: e, matches: countCopyMatchesFor(index, e, language) }));
  }, [entities, target, scope, query, index, language]);

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-ink/20 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Copy metadata from another entity"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        className="w-full max-w-[32rem] max-h-full flex flex-col bg-paper rounded-lg border border-border shadow-lg overflow-hidden"
      >
        <header className="shrink-0 flex items-center gap-2 h-11 px-3 border-b border-border">
          <span className="text-xs font-semibold text-ink">Copy from</span>
          <span className="text-[11px] text-ink-tertiary">
            values are staged, not saved
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ms-auto p-1 rounded-md text-ink-muted hover:bg-warm hover:text-ink cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
          >
            <X size={14} />
          </button>
        </header>

        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border">
          <div className="flex-1 flex items-center gap-1.5 h-8 px-2 bg-warm rounded-md">
            <Search size={13} className="text-ink-muted shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title"
              aria-label="Search entities"
              autoFocus
              className="flex-1 min-w-0 bg-transparent text-xs text-ink placeholder:text-ink-muted focus:outline-none"
            />
          </div>
          {/* The escape hatch, not the default. */}
          <SegmentedControl
            size="sm"
            ariaLabel="Which entities to offer"
            value={scope}
            onChange={(v) => setScope(v as "type" | "any")}
            options={[
              { id: "type", label: typeName },
              { id: "any", label: "Any type" },
            ]}
          />
        </div>

        <ul className="flex-1 overflow-auto py-1">
          {candidates.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-ink-muted">
              {query.trim()
                ? "No entity of this type matches that title."
                : "Nothing else of this type to copy from."}
            </li>
          )}
          {candidates.map(({ entity, matches }) => (
            <li key={entity.id}>
              <button
                type="button"
                onClick={() => onPreview(entity)}
                disabled={matches === 0}
                className={`group w-full flex items-center gap-2 px-3 py-2 text-start transition-colors
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset
                  focus-visible:ring-carbon/40 ${
                    matches === 0
                      ? "opacity-55 cursor-not-allowed"
                      : "hover:bg-parchment cursor-pointer"
                  }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-ink">{entity.title}</span>
                  <span className="mt-0.5 block">
                    <EntityPill typeId={entity.typeId} />
                  </span>
                </span>
                {/* The number Uwazi makes you click to find out. */}
                <span className="shrink-0 flex items-center gap-1.5 text-[11px] text-ink-tertiary">
                  {matches === 0 ? (
                    <span>no shared fields</span>
                  ) : (
                    <>
                      <CountBadge count={matches} />
                      <span>{matches === 1 ? "field" : "fields"}</span>
                    </>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
