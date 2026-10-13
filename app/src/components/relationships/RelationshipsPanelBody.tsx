import { useRelAtom } from "../../hooks/useEntityScope";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { breakpointAtom } from "../../atoms/viewport";
import { Link2 } from "lucide-react";
import {
  relViewAtom,
  relGroupByAtom,
  relSubGroupByAtom,
  relSearchQueryAtom,
} from "../../atoms/filters";
import { useFilteredReferences } from "./useFilteredReferences";
import {
  getGroupColor,
  getGroupLabel,
  groupRefs,
} from "../../utils/connectionGrouping";
import { RelationshipsTreeView } from "./RelationshipsTreeView";
import { RelationshipsGraphView } from "./RelationshipsGraphView";
import { WhenBody } from "./when/WhenBody";
import { RelationshipRow } from "./RelationshipRow";
import { countOf, deriveHubs, type Hub } from "../../utils/relationships";
import type { GroupBy } from "../../atoms/filters";
import type { Reference } from "../../data/references";
import { HubNode } from "./HubNode";
import { MemberCard, type MemberCardHide } from "./rows/MemberCard";
import { RelationshipGroupedCard } from "./RelationshipGroupedCard";
import { GroupShapeEnd, GroupShapeLine, groupShape, groupShapeLabel, spanDomain } from "./GroupSummary";

interface Props {
  onDelete?: (id: string) => void;
  scrollBgClass?: string;
  /** A block drawn first in the list and tree lanes, scrolling with them (the
   *  Claim record's evidence matrix). The graph and When views own their
   *  canvas and do not show it. */
  lead?: ReactNode;
}

/** How many flat reference rows to render before "Show more". */
const LIST_CAP = 100;

/** What a list draws, in the order of its references: a hub (2+ members)
 *  once, where its first member falls, and the rest either one row per
 *  reference (plain List) or one row per record (inside a group, so a record
 *  linked five times reads once). Built from the filtered set, so a hub shows
 *  only the members that survive the filters. */
type ListItem =
  | { kind: "hub"; key: string; hub: Hub; refs: Reference[] }
  | { kind: "reference"; key: string; ref: Reference }
  | { kind: "record"; key: string; entityId: string; refs: Reference[] };

function listItems(refs: Reference[], unit: "reference" | "record"): ListItem[] {
  const hubs = deriveHubs(refs);
  const hubOf = new Map<string, Hub>();
  for (const hub of hubs) for (const id of hub.refIds) hubOf.set(id, hub);
  const byId = new Map(refs.map((r) => [r.id, r]));
  const items: ListItem[] = [];
  const seenHubs = new Set<string>();
  const records = new Map<string, Extract<ListItem, { kind: "record" }>>();
  for (const ref of refs) {
    const hub = hubOf.get(ref.id);
    if (hub) {
      if (seenHubs.has(hub.id)) continue;
      seenHubs.add(hub.id);
      items.push({ kind: "hub", key: `hub:${hub.id}`, hub, refs: hub.refIds.map((id) => byId.get(id)!) });
    } else if (unit === "reference") {
      items.push({ kind: "reference", key: ref.id, ref });
    } else {
      let item = records.get(ref.targetEntityId);
      if (!item) {
        item = { kind: "record", key: `rec:${ref.targetEntityId}`, entityId: ref.targetEntityId, refs: [] };
        records.set(ref.targetEntityId, item);
        items.push(item);
      }
      item.refs.push(ref);
    }
  }
  return items;
}

/** What a row leaves out because its group (and sub-group) already says it. */
function hideFor(...keys: GroupBy[]): MemberCardHide {
  return {
    template: keys.includes("target-template"),
    // An entity's group header lists its link types and their direction.
    relation: keys.includes("relation-type") || keys.includes("target-entity"),
    direction: keys.includes("direction") || keys.includes("target-entity"),
    title: keys.includes("target-entity"),
  };
}

/** A group's rows, one per record, hubs opening to their members. */
function RecordList({
  items,
  hide,
  exclude,
  onDelete,
}: {
  items: ListItem[];
  hide: MemberCardHide;
  exclude: Set<string>;
  onDelete?: (id: string) => void;
}) {
  return (
    <ul data-part="rows" className="divide-y divide-border/50">
      {items.map((item) => (
        <li key={item.key}>
          {item.kind === "hub" ? (
            <HubNode hub={item.hub} refs={item.refs} hideRelLabel={!!hide.relation} host="list" hide={hide} exclude={exclude} />
          ) : item.kind === "record" ? (
            <MemberCard
              variant="row"
              entityId={item.entityId}
              refs={item.refs}
              exclude={exclude}
              hide={hide}
              onDelete={onDelete}
            />
          ) : (
            <RelationshipRow kind="reference" reference={item.ref} onDelete={onDelete} />
          )}
        </li>
      ))}
    </ul>
  );
}

/** The records an "Also linked to" line leaves out: every record the panel
 *  already shows, and the record it is about. The line names only what the
 *  panel does not. */
function excludeFor(refs: Reference[]): Set<string> {
  const ids = new Set<string>();
  for (const r of refs) {
    ids.add(r.targetEntityId);
    ids.add(r.sourceEntityId);
  }
  return ids;
}

/** Body of the merged Relationships panel — toolbar lives above. */
export function RelationshipsPanelBody({ onDelete, scrollBgClass, lead }: Props) {
  const [view] = useRelAtom(relViewAtom);
  const [groupBy] = useRelAtom(relGroupByAtom);
  const [subGroupBy] = useRelAtom(relSubGroupByAtom);
  // Marked on the group headers — where a relation-type match shows once the
  // rows beneath stop repeating that label.
  const [query] = useRelAtom(relSearchQueryAtom);

  // The one shared pipeline (cluster → facets → search → sort) — List, Tree,
  // and Graph all filter through it. See useFilteredReferences.
  const filtered = useFilteredReferences();

  // Well-connected entities (e.g. a País) can have thousands of references —
  // cap the flat list render and reveal more on demand so it never paints them all.
  const [listLimit, setListLimit] = useState(LIST_CAP);
  useEffect(() => setListLimit(LIST_CAP), [filtered]);

  // Each group's shape, and one time axis for all of them so their spans
  // compare. Sub-groups draw on the same axis.
  const compact = useAtomValue(breakpointAtom) === "mobile";
  const grouped = useMemo(() => {
    if (view !== "list" || groupBy === "none") return null;
    const groups = groupRefs(filtered, groupBy).map(([key, refs]) => ({
      key,
      refs,
      shape: groupShape(refs, groupBy),
      items: subGroupBy === "none" ? listItems(refs, "record") : null,
      subGroups:
        subGroupBy === "none"
          ? null
          : groupRefs(refs, subGroupBy).map(([subKey, subRefs]) => ({
              subKey,
              subRefs,
              shape: groupShape(subRefs, subGroupBy),
              items: listItems(subRefs, "record"),
            })),
    }));
    return { groups, domain: spanDomain(groups.map((g) => g.shape)) };
  }, [view, filtered, groupBy, subGroupBy]);
  // Plain List: one row per reference, a hub once.
  const flatItems = useMemo(
    () => (view === "list" && groupBy === "none" ? listItems(filtered, "reference") : []),
    [view, filtered, groupBy],
  );
  const panelExclude = useMemo(() => excludeFor(filtered), [filtered]);

  if (view === "tree") {
    return <RelationshipsTreeView lead={lead} />;
  }
  if (view === "when") {
    return (
      // A scroll lane, like the list: the cards sit on the host's gutter.
      <div
        data-component="RelationshipsPanelBody"
        data-view="when"
        className={`bleed flex-1 overflow-auto pb-8 relative ${scrollBgClass ?? ""}`}
      >
        {lead}
        <WhenBody />
      </div>
    );
  }
  if (view === "graph") {
    return (
      <>
        {/* A claim's evidence leads every view. Above the canvas it scrolls in
            its own band, so the graph keeps most of the pane. */}
        {lead && <div data-part="lead" className="shrink-0 max-h-[40%] overflow-auto pb-stack">{lead}</div>}
        {/* The canvas runs edge to edge on purpose. */}
        <div data-component="RelationshipsPanelBody" data-view="graph" data-gutter-bleed className="bleed-flush flex-1 flex flex-col min-h-0">
          <RelationshipsGraphView />
        </div>
      </>
    );
  }

  let body: ReactNode;
  if (filtered.length === 0) {
    body = (
      <div data-part="empty" className="flex flex-col items-center justify-center py-16 text-center">
        <Link2 size={36} className="text-ink-tertiary/40 mb-3" aria-hidden />
        <p className="text-sm font-medium text-ink-secondary">No relationships found</p>
        <p className="text-xs text-ink-tertiary mt-1">
          Select text in the document to create one
        </p>
      </div>
    );
  } else if (groupBy === "none") {
    // The cap counts rows; "Show more" counts the references not yet drawn.
    const shown = flatItems.slice(0, listLimit);
    const drawn = shown.reduce((n, item) => n + (item.kind === "reference" ? 1 : item.refs.length), 0);
    body = (
      <div>
        <div className="border border-border/60 rounded-md overflow-hidden bg-paper">
          <RecordList items={shown} hide={{}} exclude={panelExclude} onDelete={onDelete} />
        </div>
        {flatItems.length > listLimit && (
          <div className="flex justify-center pt-stack">
            <button
              type="button"
              data-part="show-more"
              onClick={() => setListLimit((n) => n + LIST_CAP)}
              className="px-4 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
            >
              Show more — {(filtered.length - drawn).toLocaleString()} more references
            </button>
          </div>
        )}
      </div>
    );
  } else {
    const { groups, domain } = grouped!;
    body = (
      <ul data-part="groups" className="space-y-stack">
        {groups.map(({ key, refs, shape, items, subGroups }) => (
          <li key={`p:${key}`}>
            <RelationshipGroupedCard
              title={getGroupLabel(key, groupBy)}
              highlight={query}
              color={getGroupColor(key, groupBy)}
              count={refs.length}
              countLabel={countOf(refs.length, "reference")}
              refIdsToWatch={refs.map((r) => r.id)}
              shapeLabel={groupShapeLabel(getGroupLabel(key, groupBy), shape, groupBy)}
              shapeEnd={<GroupShapeEnd shape={shape} />}
              shapeLine={<GroupShapeLine shape={shape} by={groupBy} domain={domain} compact={compact} />}
            >
              {subGroups === null ? (
                <RecordList items={items!} hide={hideFor(groupBy)} exclude={panelExclude} onDelete={onDelete} />
              ) : (
                <ul data-part="groups" className="px-2 py-2 space-y-1.5 bg-warm/30">
                  {subGroups.map(({ subKey, subRefs, shape: sub, items: subItems }) => (
                    <li key={`s:${key}::${subKey}`}>
                      <RelationshipGroupedCard
                        title={getGroupLabel(subKey, subGroupBy)}
                        highlight={query}
                        color={getGroupColor(subKey, subGroupBy)}
                        count={subRefs.length}
                        countLabel={countOf(subRefs.length, "reference")}
                        refIdsToWatch={subRefs.map((r) => r.id)}
                        shapeLabel={groupShapeLabel(getGroupLabel(subKey, subGroupBy), sub, subGroupBy)}
                        shapeEnd={<GroupShapeEnd shape={sub} />}
                        shapeLine={<GroupShapeLine shape={sub} by={subGroupBy} domain={domain} compact={compact} />}
                      >
                        <RecordList items={subItems} hide={hideFor(groupBy, subGroupBy)} exclude={panelExclude} onDelete={onDelete} />
                      </RelationshipGroupedCard>
                    </li>
                  ))}
                </ul>
              )}
            </RelationshipGroupedCard>
          </li>
        ))}
      </ul>
    );
  }

  // No info row. Once the count moved to the tab strip its only remaining job
  // was hosting the collapse pair, and that has moved to the footer action bar —
  // which is mounted in every view, so the controls no longer come and go with
  // the body. What is left is the list itself, starting directly under the
  // toolbar: an empty reserved row would have been holding space for nothing.
  return (
    // A scroll lane: `bleed` puts the scrollbar at the panel edge and the cards
    // back on the host's gutter.
    <div
      data-component="RelationshipsPanelBody"
      data-view={view}
      className={`bleed flex-1 overflow-auto pb-8 relative ${scrollBgClass ?? ""}`}>
      {lead}
      {body}
    </div>
  );
}
