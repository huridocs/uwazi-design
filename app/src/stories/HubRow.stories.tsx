import { useMemo, type ReactNode } from "react";
import { Provider, createStore } from "jotai";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RelationshipRow } from "../components/relationships/RelationshipRow";
import { editModeAtom, zoomAtom, type Zoom } from "../atoms/filters";
import { references } from "../data/references";
import { deriveHubs } from "../utils/relationships";

/** An n-ary relationship — Uwazi's hub: one container, three or more member
 *  entities, every member related to every other. There is no direction glyph
 *  because there is no direction to draw: the relationship is symmetric.
 *
 *  Members render as pills, and each pill opens its own entity — there is no
 *  row-wide open here because there is no single entity to open. The row is
 *  deliberately a peer of the aggregate row rather than a container above it: a
 *  hub IS one relationship, not a group of them. */
const meta = {
  title: "Relationships/HubRow",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const hubs = deriveHubs(references);
const hub = hubs[0];

function Frame({
  zoom = "detail",
  editMode = false,
  children,
}: {
  zoom?: Zoom;
  editMode?: boolean;
  children: ReactNode;
}) {
  const store = useMemo(() => {
    const s = createStore();
    s.set(zoomAtom, zoom);
    s.set(editModeAtom, editMode);
    return s;
  }, [zoom, editMode]);

  return (
    <Provider store={store}>
      <div className="w-full max-w-md bg-paper border border-border/40 rounded-md overflow-hidden">
        {children}
      </div>
    </Provider>
  );
}

/** Detail — the members wrap as pills, with the "hub" mark and the evidence
 *  count on the right and the relation plus party count beneath. */
export const Default: Story = {
  render: () => (
    <Frame>
      <RelationshipRow kind="hub" hub={hub} expanded={false} onToggleExpand={() => {}} />
    </Frame>
  ),
};

/** Nothing to expand into: no member reference carries a quoted passage, so the
 *  badge is a FACT rather than a control — no hover, no cursor, no tab stop, no
 *  `aria-expanded`. A badge that opened an empty box would be a promise the row
 *  can't keep. */
export const NotExpandable: Story = {
  render: () => (
    <Frame>
      <RelationshipRow kind="hub" hub={hub} />
    </Frame>
  ),
};

/** Expanded — chevron turned, badge on vellum. */
export const Expanded: Story = {
  render: () => (
    <Frame>
      <RelationshipRow kind="hub" hub={hub} expanded onToggleExpand={() => {}} />
    </Frame>
  ),
};

/** Compact — the same two columns, minus the caption line. */
export const Compact: Story = {
  render: () => (
    <Frame zoom="compact">
      {hubs.slice(0, 3).map((h) => (
        <RelationshipRow key={h.id} kind="hub" hub={h} expanded={false} onToggleExpand={() => {}} />
      ))}
    </Frame>
  ),
};

/** Overview — one line, so the pills CLIP at three and the rest become a count.
 *  Every row is the same height here; wrapping would break the scan. */
export const Overview: Story = {
  render: () => (
    <Frame zoom="overview">
      {hubs.slice(0, 3).map((h) => (
        <RelationshipRow key={h.id} kind="hub" hub={h} expanded={false} onToggleExpand={() => {}} />
      ))}
    </Frame>
  ),
};

/** Edit mode — one checkbox for the hub covers every member's references. */
export const EditMode: Story = {
  render: () => (
    <Frame editMode>
      {hubs.slice(0, 3).map((h) => (
        <RelationshipRow key={h.id} kind="hub" hub={h} expanded={false} onToggleExpand={() => {}} />
      ))}
    </Frame>
  ),
};
