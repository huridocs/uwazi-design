import { getEntity } from "../../../data/entities";
import { SpineDate } from "../../library/TimeSpine";
import { RowEntityPill } from "../rows/RowParts";
import type { WhenEvent } from "../../../utils/entityDates";

/** One line of the When spine. The entity's OWN dates print as their label in
 *  ink (the page is already that entity — a pill naming it again would be
 *  noise); a connected entity's print as its pill (which opens the preview,
 *  like every pill) and, where there is room, the date's label and the relation
 *  that reached it. A span (a mandate) prints its years instead of a day. */
export function EventRow({ event, selected }: { event: WhenEvent<string>; selected?: boolean }) {
  const { date } = event;
  const entity = event.own ? null : getEntity(event.entityId);
  return (
    <div
      data-component="EventRow"
      data-own={event.own || undefined}
      className={`flex items-center gap-2 h-[22px] px-2 rounded-md transition-colors ${
        selected ? "bg-parchment" : "hover:bg-parchment"
      }`}
    >
      {date.end ? (
        <span className="shrink-0 w-[5.5rem] text-meta tabular-nums text-ink-tertiary">
          <bdi dir="ltr">{`${new Date(date.t).getUTCFullYear()}–${new Date(date.end).getUTCFullYear()}`}</bdi>
        </span>
      ) : (
        <SpineDate t={date.t} />
      )}
      {event.own ? (
        <span className="min-w-0 truncate text-xs font-medium text-ink">{date.label}</span>
      ) : (
        <>
          <span className="min-w-0 shrink flex">
            <RowEntityPill entityId={event.entityId} typeId={entity?.typeId ?? ""} label={entity?.title} />
          </span>
          {/* Each run isolated: a label in one script and a relation in another
              must not reorder each other, and "+2" must stay "+2". */}
          <span className="hidden md:inline min-w-0 truncate text-meta text-ink-tertiary">
            <bdi>{date.label}</bdi>
            {event.via.length > 0 && (
              <>
                {" · "}
                <bdi>{event.via[0]}</bdi>
              </>
            )}
            {event.via.length > 1 && (
              <>
                {" "}
                <bdi dir="ltr">{`+${event.via.length - 1}`}</bdi>
              </>
            )}
          </span>
        </>
      )}
    </div>
  );
}
