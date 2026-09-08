import { useMemo, type ReactNode } from "react";
import { Provider, createStore } from "jotai";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RelationshipRow } from "../components/relationships/RelationshipRow";
import { editModeAtom, zoomAtom, type Zoom } from "../atoms/filters";
import { activeRefIdAtom } from "../atoms/references";
import { references } from "../data/references";

/** One text-anchored (or entity-level) reference — the evidence row. It is the
 *  leaf of every connections surface: the list view's rows, and what an
 *  aggregate reveals when you expand it.
 *
 *  Three densities come from `zoomAtom`, and the shell that picks between them
 *  is shared with the aggregate and hub rows (`rows/RowShell.tsx`) so a tier
 *  means the same thing in all three. What varies per tier is what the row can
 *  afford to say: overview is a pill and a page, compact adds the direction and
 *  the relation, detail adds the quoted passage and the hover actions.
 *
 *  A row is never a `role="button"` — it hosts its own controls (page tag,
 *  checkbox, delete), so the keyboard path is a stretched invisible button
 *  behind the content. */
const meta = {
  title: "Relationships/ReferenceRow",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const anchored = references.find((r) => !!r.sourceSelection) ?? references[0];
const entityLevel = references.find((r) => !r.sourceSelection) ?? references[0];
const targetAnchored = references.find((r) => !!r.targetSelection) ?? anchored;

/** The panel's own frame, with the atoms the rows read pre-set. Rows are meant
 *  to sit in a bordered column — on their own they read as floating text. */
function Frame({
  zoom = "detail",
  editMode = false,
  activeRefId = null,
  children,
}: {
  zoom?: Zoom;
  editMode?: boolean;
  activeRefId?: string | null;
  children: ReactNode;
}) {
  const store = useMemo(() => {
    const s = createStore();
    s.set(zoomAtom, zoom);
    s.set(editModeAtom, editMode);
    s.set(activeRefIdAtom, activeRefId);
    return s;
  }, [zoom, editMode, activeRefId]);

  return (
    <Provider store={store}>
      <div className="w-full max-w-md bg-paper border border-border/40 rounded-md overflow-hidden">
        {children}
      </div>
    </Provider>
  );
}

/** Detail — the quoted passage, its page, the relation, and the hover actions
 *  (preview, delete) that appear on hover or keyboard focus. */
export const Default: Story = {
  render: () => (
    <Frame>
      <RelationshipRow kind="reference" reference={anchored} onDelete={() => {}} />
    </Frame>
  ),
};

/** No text anchor: an entity-to-entity link with no quoted passage. The snippet
 *  block is absent rather than empty — most of the CEJIL corpus looks like
 *  this. */
export const EntityLevel: Story = {
  render: () => (
    <Frame>
      <RelationshipRow kind="reference" reference={entityLevel} onDelete={() => {}} />
    </Frame>
  ),
};

/** Both ends anchored: the target document's own passage rides below the
 *  source's, labelled, so the two quotes read as the two ends of one
 *  relationship. */
export const TargetAnchored: Story = {
  render: () => (
    <Frame>
      <RelationshipRow kind="reference" reference={targetAnchored} onDelete={() => {}} />
    </Frame>
  ),
};

/** Compact — one line: pill, direction, relation, page. No passage. */
export const Compact: Story = {
  render: () => (
    <Frame zoom="compact">
      {references.slice(0, 3).map((reference) => (
        <RelationshipRow key={reference.id} kind="reference" reference={reference} />
      ))}
    </Frame>
  ),
};

/** Overview — the densest tier: pill and page only, so a long list stays
 *  scannable at a glance. */
export const Overview: Story = {
  render: () => (
    <Frame zoom="overview">
      {references.slice(0, 5).map((reference) => (
        <RelationshipRow key={reference.id} kind="reference" reference={reference} />
      ))}
    </Frame>
  ),
};

/** Nested — the same row inside an aggregate's inline expand. The pill, type
 *  and relation are dropped because the aggregate above already said them;
 *  the passage and its page are what actually vary between siblings. */
export const Nested: Story = {
  render: () => (
    <Frame>
      <RelationshipRow kind="reference" reference={anchored} nested />
    </Frame>
  ),
};

/** Selected — `bg-parchment`, the canonical selected state, set by clicking the
 *  row or by a jump from the document's minimap. */
export const Selected: Story = {
  render: () => (
    <Frame activeRefId={anchored.id}>
      <RelationshipRow kind="reference" reference={anchored} onDelete={() => {}} />
    </Frame>
  ),
};

/** Edit mode — every row grows a checkbox for the action bar's bulk delete.
 *  Nothing else moves: the gutter is part of the row's layout, not an
 *  insertion. */
export const EditMode: Story = {
  render: () => (
    <Frame editMode>
      {references.slice(0, 3).map((reference) => (
        <RelationshipRow key={reference.id} kind="reference" reference={reference} />
      ))}
    </Frame>
  ),
};
