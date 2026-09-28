/* The When view: the connected entities laid on time.
 *
 * Unit = a dated EVENT: one dated property of the entity itself, or of an entity
 * connected to it. Relationships carry no dates of their own, so a connection is
 * placed at the dates of the entity at its other end. It reads the ONE filter
 * pipeline (useFilteredReferences), so every facet and the search apply here as
 * in the other views; its own control is the year strip.
 *
 * Built to move into the redesign's LensControl as the "When" lens unchanged:
 * it takes nothing from its host but the entity scope. */
import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { CalendarX } from "lucide-react";
import { useEntityScopeId, useRelAtom } from "../../../hooks/useEntityScope";
import { whenYearsAtom } from "../../../atoms/filters";
import { languageAtom } from "../../../atoms/language";
import { previewEntityIdAtom } from "../../../atoms/references";
import { getEntity, getEntityType } from "../../../data/entities";
import { datesOf } from "../../../data/entityDates";
import { relationLabel } from "../../../utils/inheritance";
import { eventsAround, eventsPerYear, inYears, yearOf, type WhenEvent } from "../../../utils/entityDates";
import { TimeSpine, type SpineRow } from "../../library/TimeSpine";
import { useFilteredReferences } from "../useFilteredReferences";
import { RowEntityPill } from "../rows/RowParts";
import { EventRow } from "./EventRow";
import { YearStrip } from "./YearStrip";

/** Above this many events the spine would be a wall: the body lists years
 *  instead, and a year opens its own spine. */
export const WHEN_SPINE_CAP = 240;

export function WhenBody() {
  const selfId = useEntityScopeId();
  const lang = useAtomValue(languageAtom);
  const filtered = useFilteredReferences({ sort: false });
  const [range, setRange] = useRelAtom(whenYearsAtom);
  const previewing = useAtomValue(previewEntityIdAtom);

  const { events, undated } = useMemo(
    () =>
      eventsAround(
        selfId,
        filtered.map((r) => ({ entityId: r.targetEntityId, via: relationLabel(r.relationType) })),
        (id) => datesOf(id, lang),
      ),
    [selfId, filtered, lang],
  );
  const years = useMemo(() => eventsPerYear(events), [events]);
  const shown = useMemo(() => inYears(events, range), [events, range]);
  const self = getEntity(selfId);

  const rows = useMemo<SpineRow<WhenEvent<string>>[]>(
    () => shown.map((e) => ({ key: e.key, t: e.date.t, tEnd: e.date.end, item: e })),
    [shown],
  );
  const color = (e: WhenEvent<string>) =>
    e.own ? "var(--text-primary)" : (getEntityType(getEntity(e.entityId)?.typeId ?? "")?.color ?? "var(--text-tertiary)");

  const aggregate = shown.length > WHEN_SPINE_CAP;
  const byYear = useMemo(() => {
    if (!aggregate) return [];
    const map = new Map<number, WhenEvent<string>[]>();
    for (const e of shown) {
      const y = yearOf(e.date.t);
      const list = map.get(y);
      if (list) list.push(e);
      else map.set(y, [e]);
    }
    return [...map.entries()];
  }, [aggregate, shown]);

  if (!events.length && !undated.length) {
    return (
      <div data-part="empty" className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarX size={36} className="text-ink-tertiary/40 mb-3" aria-hidden />
        <p className="text-sm text-ink-tertiary">Nothing here has a date</p>
        <p className="text-xs text-ink-tertiary mt-1">Dated properties of this entity and its connections show here</p>
      </div>
    );
  }

  return (
    <div data-component="WhenBody" className="flex flex-col gap-stack">
      <YearStrip years={years} range={range} onChange={setRange} />

      {shown.length > 0 && (
        <section className="border border-border/60 rounded-md bg-paper">
          <header className="flex items-baseline gap-2 px-3 py-2 border-b border-border/60">
            <h3 className="text-sm font-medium text-ink" dir="auto">
              {shown.length.toLocaleString("en-US")} dated event{shown.length === 1 ? "" : "s"}
            </h3>
            <span className="text-meta text-ink-tertiary min-w-0 truncate" dir="auto">
              {aggregate ? "too many to lay out one by one — open a year" : `around ${self?.title ?? ""}`}
            </span>
          </header>
          {aggregate ? (
            <ul data-part="years">
              {byYear.map(([year, list]) => {
                const kinds = new Map<string, number>();
                for (const e of list) {
                  const name = getEntityType(getEntity(e.entityId)?.typeId ?? "")?.name ?? "";
                  kinds.set(name, (kinds.get(name) ?? 0) + 1);
                }
                const top = [...kinds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
                return (
                  <li key={year} className="border-t border-border/60 first:border-t-0">
                    <button
                      type="button"
                      onClick={() => setRange([year, year])}
                      className="w-full flex items-baseline gap-3 px-3 h-7 text-start hover:bg-parchment transition-colors cursor-pointer
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/40"
                    >
                      <span className="w-12 shrink-0 text-meta tabular-nums text-ink-tertiary">{year}</span>
                      <span className="w-20 shrink-0 text-xs text-ink">
                        {list.length} event{list.length === 1 ? "" : "s"}
                      </span>
                      <span className="min-w-0 truncate text-meta text-ink-tertiary" dir="auto">
                        {top.map(([k, n]) => `${k} ${n}`).join(" · ")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-1 py-2">
              <TimeSpine
                rows={rows}
                dotColor={color}
                dotActive={(e) => e.entityId === previewing}
                renderRow={(e) => <EventRow event={e} selected={e.entityId === previewing} />}
              />
            </div>
          )}
        </section>
      )}

      {undated.length > 0 && (
        <section className="border border-border/60 rounded-md bg-paper">
          <header className="flex items-baseline gap-2 px-3 py-2 border-b border-border/60">
            <h3 className="text-sm font-medium text-ink">Without a date</h3>
            <span className="text-meta text-ink-tertiary" dir="auto">
              {undated.length} connected, nothing on either end is dated
            </span>
          </header>
          <div className="flex flex-wrap gap-1.5 px-3 py-2.5">
            {undated.map((u) => {
              const e = getEntity(u.entityId);
              return <RowEntityPill key={u.entityId} entityId={u.entityId} typeId={e?.typeId ?? ""} label={e?.title} />;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
