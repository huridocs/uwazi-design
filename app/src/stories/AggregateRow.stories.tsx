import { useMemo, type ReactNode } from "react";
import { Provider, createStore } from "jotai";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RelationshipRow } from "../components/relationships/RelationshipRow";
import { editModeAtom, zoomAtom, type Zoom } from "../atoms/filters";
import { activeAggregateIdAtom } from "../atoms/references";
import { references } from "../data/references";
import { deriveRelationships } from "../utils/relationships";

/** The deduped relationship — one row per `(target entity, relation type)`,
 *  standing for every reference that backs it. It is what the tree and the
 *  graph render; the list renders the evidence rows themselves.
 *
 *  The count badge is the drill-down: inside the tree it toggles the backing
 *  references in place, elsewhere it routes to them in the References panel —
 *  which is why it always says which in its title. The chevron appears only
 *  where there is something to expand into. */
const meta = {
  title: "Relationships/AggregateRow",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const rels = deriveRelationships(references);
const first = rels[0];
/** Both directions collapsed into one aggregate — the glyph says so. */
const bidirectional = rels.find((r) => r.directions.length > 1) ?? first;

function Frame({
  zoom = "detail",
  editMode = false,
  activeAggregateId = null,
  children,
}: {
  zoom?: Zoom;
  editMode?: boolean;
  activeAggregateId?: string | null;
  children: ReactNode;
}) {
  const store = useMemo(() => {
    const s = createStore();
    s.set(zoomAtom, zoom);
    s.set(editModeAtom, editMode);
    s.set(activeAggregateIdAtom, activeAggregateId);
    return s;
  }, [zoom, editMode, activeAggregateId]);

  return (
    <Provider store={store}>
      <div className="w-full max-w-md bg-paper border border-border/40 rounded-md overflow-hidden">
        {children}
      </div>
    </Provider>
  );
}

/** Detail — type tag, entity, direction and relation, with the evidence count
 *  on the right. */
export const Default: Story = {
  render: () => (
    <Frame>
      <RelationshipRow kind="aggregate" rel={first} />
    </Frame>
  ),
};

/** Incoming and outgoing references to the same target and type collapse into
 *  ONE row, and the glyph goes bidirectional rather than the row appearing
 *  twice. */
export const Bidirectional: Story = {
  render: () => (
    <Frame>
      <RelationshipRow kind="aggregate" rel={bidirectional} />
    </Frame>
  ),
};

/** Expandable — in the tree, where the badge and the chevron open the backing
 *  evidence in place. */
export const Expandable: Story = {
  render: () => (
    <Frame>
      <RelationshipRow kind="aggregate" rel={first} expanded={false} onToggleExpand={() => {}} />
    </Frame>
  ),
};

/** Expanded — the chevron turns and the badge takes the vellum ground, so the
 *  row says it is the one that is open. */
export const Expanded: Story = {
  render: () => (
    <Frame>
      <RelationshipRow kind="aggregate" rel={first} expanded onToggleExpand={() => {}} />
    </Frame>
  ),
};

/** Under a group that already keys on this entity, the pill would just repeat
 *  the group header — so the relation becomes the row's title instead of the
 *  row saying the same thing twice. `hideRelLabel` and `hideTypePill` are the
 *  same idea for the other two grouping axes. */
export const PillHidden: Story = {
  render: () => (
    <Frame>
      <RelationshipRow kind="aggregate" rel={first} hidePill />
    </Frame>
  ),
};

/** Compact — one line: direction, type, entity, relation, count. */
export const Compact: Story = {
  render: () => (
    <Frame zoom="compact">
      {rels.slice(0, 3).map((rel) => (
        <RelationshipRow key={rel.id} kind="aggregate" rel={rel} />
      ))}
    </Frame>
  ),
};

/** Overview — pill and count only. In the tree these rows drop their divider:
 *  the connector lines are the structure there, and a second rule per row reads
 *  as noise. */
export const Overview: Story = {
  render: () => (
    <Frame zoom="overview">
      {rels.slice(0, 5).map((rel) => (
        <RelationshipRow key={rel.id} kind="aggregate" rel={rel} />
      ))}
    </Frame>
  ),
};

/** Selected — the row the reader picked, not every sibling pointing at the same
 *  entity. Several aggregates can share a target (one per relation type), so
 *  selection is keyed on the aggregate, not the entity. */
export const Selected: Story = {
  render: () => (
    <Frame activeAggregateId={first.id}>
      {rels.slice(0, 3).map((rel) => (
        <RelationshipRow key={rel.id} kind="aggregate" rel={rel} />
      ))}
    </Frame>
  ),
};

/** Edit mode — the checkbox covers every reference behind the aggregate, so
 *  ticking it selects the whole set atomically. */
export const EditMode: Story = {
  render: () => (
    <Frame editMode>
      {rels.slice(0, 3).map((rel) => (
        <RelationshipRow key={rel.id} kind="aggregate" rel={rel} />
      ))}
    </Frame>
  ),
};
