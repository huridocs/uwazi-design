import { memo } from "react";
import type { Entity } from "../../data/entities";
import { getEntityType } from "../../data/entities";
import { EntityTypeTag } from "../shared/EntityTypeTag";
import { HighlightedText } from "../shared/HighlightedText";
import { ListCardRow } from "../shared/ListCardRow";

const fmt = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** The Library's List view on a phone: two-line rows instead of the table.
 *  The title wraps to two lines; under it one muted line carries only the
 *  fields that have a value (template · country · date), so an empty Country
 *  never shows as "—" and no column holds width for it. Sort stays in the
 *  Display menu. Each row is a ListCardRow with its stretched primary button. */
export const MobileEntityList = memo(function MobileEntityList({
  rows,
  query,
  selectedId,
  onSelect,
}: {
  rows: Entity[];
  query: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul data-component="MobileEntityList" className="rounded-lg border border-border bg-paper overflow-hidden">
      {rows.map((e) => {
        const meta = [getEntityType(e.typeId)?.name, e.country, e.createdAt ? fmt.format(new Date(e.createdAt)) : undefined].filter(Boolean);
        return (
          <ListCardRow key={e.id} as="li" selected={selectedId === e.id} onClick={() => onSelect(e.id)} ariaLabel={`Preview ${e.title}`} className="min-h-14">
            <div className="flex items-start gap-2.5">
              <span className="pt-1 shrink-0">
                <EntityTypeTag typeId={e.typeId} variant="swatch" />
              </span>
              <div className="min-w-0 flex flex-col gap-0.5">
                <span className="text-sm font-medium text-ink leading-snug line-clamp-2 break-words">
                  <HighlightedText text={e.title} query={query} />
                </span>
                {meta.length ? <span className="text-xs text-ink-tertiary truncate">{meta.join(" · ")}</span> : null}
              </div>
            </div>
          </ListCardRow>
        );
      })}
    </ul>
  );
});
