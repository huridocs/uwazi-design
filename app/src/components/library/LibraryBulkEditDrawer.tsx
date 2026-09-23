import { useMemo } from "react";
import { useSetAtom } from "jotai";
import { PenLine } from "lucide-react";
import { libraryBulkEditOpenAtom } from "../../atoms/library";
import { getEntity, getEntityType } from "../../data/entities";
import { typeLabelColor } from "../../utils/typeColor";
import { MetadataEditBody } from "../../views/MetadataView";

/** The selection drawer's EDIT state: the bulk form over the selection, in
 *  the same drawer the list sits in. Cancel and Apply both return to the list;
 *  the selection stays either way.
 *
 *  The header names the set ("Editing 12 entities") and its templates with
 *  their counts; the banner under it is always mounted, one line on
 *  `bg-warning-light`, because it is the rule every field below follows. */
export function LibraryBulkEditDrawer({ ids }: { ids: string[] }) {
  const close = useSetAtom(libraryBulkEditOpenAtom);
  const byTemplate = useMemo(() => {
    const m = new Map<string, number>();
    for (const id of ids) {
      const t = getEntity(id)?.typeId;
      if (t) m.set(t, (m.get(t) ?? 0) + 1);
    }
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [ids]);
  const n = ids.length;

  return (
    <div data-gutter-host data-component="LibraryBulkEditDrawer" className="gutter-host flex flex-col h-full min-h-0 bg-paper">
      <div
        data-part="header"
        className="bleed shrink-0 flex flex-col gap-1.5 py-3"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        <div className="flex items-center gap-2">
          <PenLine size={15} className="text-ink-tertiary shrink-0" aria-hidden />
          <h2 className="text-sm font-semibold text-ink truncate">
            Editing {n.toLocaleString()} {n === 1 ? "entity" : "entities"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {byTemplate.map(([typeId, count]) => {
            const type = getEntityType(typeId);
            const color = type?.color ?? "#6B7280";
            // The type's square dot in its true colour; the NAME in the shared
            // label colour (never the raw one — see utils/typeColor).
            return (
              <span key={typeId} className="inline-flex items-center gap-1.5 text-xs">
                <span className="w-[0.4375rem] h-[0.4375rem] rounded-[2px] shrink-0" style={{ backgroundColor: color }} aria-hidden />
                <span className="font-medium" style={{ color: typeLabelColor(color) }}>
                  {type?.name ?? typeId}
                </span>
                <span className="text-meta text-ink-tertiary tabular-nums">{count.toLocaleString()}</span>
              </span>
            );
          })}
        </div>
      </div>
      <p
        data-part="banner"
        className="bleed shrink-0 py-2 text-xs text-ink bg-warning-light"
      >
        {/* Each sentence's first word bound to the next, so a wrap never
            strands it after the full stop. The text changes only with the
            count, so the banner's height doesn't move while editing. */}
        {`Editing\u00a0${n.toLocaleString()} entities. Only\u00a0the fields you change are written, with the same value for all.`}
      </p>
      <MetadataEditBody
        compact
        subject={{ kind: "bulk", ids }}
        sessionId="bulk-edit"
        dirtyLabel="Bulk edits"
        onCancel={() => close(false)}
        onSave={() => close(false)}
      />
    </div>
  );
}
