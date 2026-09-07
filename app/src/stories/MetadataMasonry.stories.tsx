import { Provider, createStore } from "jotai";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MetadataRecord } from "../components/metadata/MetadataRecord";
import { MAIN_ENTITY_ID, getEntityProfile } from "../data/entityProfiles";

/** The record as a masonry: cards in field order, packed by height.
 *
 *  Column count is a CONTAINER query on the record, so what changes the layout
 *  is the record's own width — resize the story frame and nothing happens; the
 *  widths below are what the component reads. One column under 44rem (the
 *  drawer and the preview overlay live here), two to 66rem, three above.
 *
 *  What to look for, and what would be broken if it were absent:
 *  - **DOM order is field order.** Tab through it, or read the a11y tree: the
 *    record is walked the way the template defines it, whatever column a card
 *    ends up in. That is the reason this is one grid with row-spans rather than
 *    N column arrays or CSS `columns`.
 *  - **Cards keep their own height** — no card is stretched to a row.
 *  - **The connection tables span every column.** A table folds to per-entity
 *    cards below 28.5rem of container; a masonry column is ~345px, so in a
 *    column they would fold permanently on a record that has room for three.
 *
 *  The Velásquez record is the mixed-height case on purpose: a long Description
 *  next to a dozen one-line fields is what makes a masonry worth having, and
 *  what a naive row grid wastes half a screen on. */
const store = createStore();
const profile = getEntityProfile(MAIN_ENTITY_ID);

function At({ width, label }: { width: number; label: string }) {
  return (
    <Provider store={store}>
      <div className="space-y-2">
        <p className="text-meta text-ink-tertiary">
          {label} — container {width}px
        </p>
        <div style={{ width }} className="bg-warm p-3 rounded-lg">
          <MetadataRecord profile={profile} language="EN" />
        </div>
      </div>
    </Provider>
  );
}

// Typed against the frame, not the record: the record's layout is decided by the
// width it is GIVEN, so every story is a width.
const meta = {
  title: "Metadata/MetadataRecord masonry",
  component: At,
  parameters: { layout: "padded" },
} satisfies Meta<typeof At>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three columns. The tall Description holds column one while the short fields
 *  fill two and three, and the next long-enough card drops back into one. */
export const Default: Story = { args: { width: 1120, label: "Main view, wide" } };

/** Two columns — the main view at a laptop width, or with the document pane
 *  dragged wide. */
export const TwoColumns: Story = { args: { width: 800, label: "Main view, narrow" } };

/** One column: the 390px drawer and the preview overlay never split. Below
 *  44rem the grid is a single column and the record reads exactly as it did
 *  before the masonry existed. */
export const Minimal: Story = { args: { width: 390, label: "Drawer / preview" } };

/** All three side by side — the same DOM, the same order, three packings. */
export const AllStates: Story = {
  args: { width: 1120, label: "" },
  render: () => (
    <div className="flex flex-wrap items-start gap-8">
      <At width={390} label="Drawer" />
      <At width={800} label="Two" />
      <At width={1120} label="Three" />
    </div>
  ),
};
