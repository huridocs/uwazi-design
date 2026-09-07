import { Provider, createStore } from "jotai";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConnectionGroupCard } from "../components/metadata/ConnectionGroupCard";
import { RelationshipFieldCard } from "../components/metadata/RelationshipFieldCard";
import { relationshipFieldsByLanguage } from "../data/metadata";
import { groupConnections } from "../utils/inheritance";

/** A connection that inherits values renders as a table of entities × inherited
 *  columns — and BELOW A MEASURED WIDTH it renders as one card per connected
 *  entity instead.
 *
 *  The switch is a CONTAINER query, not a viewport breakpoint. The same card
 *  appears in the main Metadata view, the Library drawer preview and the entity
 *  overlay, so what decides the layout is how wide the card is, not how wide the
 *  window is — resize the story's own frame and nothing happens; the widths
 *  below are what the component actually reads.
 *
 *  The threshold (28.5rem) came from measuring the widest real content, not from
 *  picking a round number — see `tableBreakpoint.ts`. */
const meta = {
  title: "Metadata/ConnectionTable",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const store = createStore();
const fields = relationshipFieldsByLanguage.EN;
const { groups } = groupConnections(fields, "EN");
const single = fields.find((f) => f.id === "rel-cases")!;

function At({ width, children }: { width: number; children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <div className="space-y-2">
        <p className="text-meta text-ink-tertiary">container: {width}px</p>
        <div style={{ width }}>{children}</div>
      </div>
    </Provider>
  );
}

/** Wide enough: the table, with its merged cells and Σ rollups in the column
 *  heads. */
export const Default: Story = {
  render: () => (
    <At width={720}>
      <div className="space-y-3">
        {groups.map((g) => (
          <ConnectionGroupCard key={g.connectionKey} group={g} span="full" />
        ))}
        <RelationshipFieldCard field={single} span="full" />
      </div>
    </At>
  ),
};

/** Below the threshold: one card per connected ENTITY, merges expanded so each
 *  is self-contained, em-dash where the connected entity has no value, and the
 *  rollups hoisted to a single header line — they summarise the column, so they
 *  belong to the set rather than to any card in it. */
export const NarrowContainer: Story = {
  render: () => (
    <At width={390}>
      <div className="space-y-3">
        {groups.map((g) => (
          <ConnectionGroupCard key={g.connectionKey} group={g} span="full" />
        ))}
        <RelationshipFieldCard field={single} span="full" />
      </div>
    </At>
  ),
};

/** Either side of the switch, together — the same data, 8px apart. */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <At width={464}>
        <ConnectionGroupCard group={groups[0]} span="full" />
      </At>
      <At width={448}>
        <ConnectionGroupCard group={groups[0]} span="full" />
      </At>
    </div>
  ),
};
