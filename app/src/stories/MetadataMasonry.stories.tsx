import { Provider, createStore } from "jotai";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MetadataRecord } from "../components/metadata/MetadataRecord";
import { MAIN_ENTITY_ID, getEntityProfile } from "../data/entityProfiles";

/** The record as a masonry, laid out by field KIND.
 *
 *  Packing by height is what made this read as scrambled — a twelve-line
 *  Description landing beside eight one-line cards, with nothing to read across.
 *  Height is an accident of the value. Kind is a fact about the field, so kind
 *  decides:
 *
 *  1. **Short scalars** — a date, a country, a case number — are not cards at
 *     all. They collect into ONE full-width Details card as a label-over-value
 *     grid, 1–3 columns by container query, no rules between cells.
 *  2. **Long text** gets its own card, two columns wide of three (one of two):
 *     prose set in a third of a wide pane is a column of six-word lines.
 *  3. **Chip fields** — a thesaurus multiselect, a link-only connection's pills —
 *     get a card and ONE column, because chips wrap to fill whatever they are
 *     given and a wide card of them is a paragraph of pills.
 *  4. **Relationships** keep their heading and their full-width tables, below
 *     and unchanged.
 *
 *  The bands run details → long → chips, and within each band the template's
 *  order is untouched, so the DOM still walks the record the way the template
 *  defines it — Tab order and a screen reader included.
 *
 *  Column count is a CONTAINER query on the record, so resizing the story frame
 *  does nothing; the widths below are what the component reads. The Velásquez
 *  record is the mixed case on purpose: ten short scalars, two paragraphs and a
 *  set of chips is exactly the shape a height-packed masonry could not order. */
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

/** Three columns: the Details grid across the top at three columns of its
 *  own, Description two columns wide, and Rights invoked in the third beside
 *  Articles invoked. */
export const Default: Story = { args: { width: 1120, label: "Main view, wide" } };

/** Two columns: the Details grid still finds three inside its full-width
 *  card, and the long cards drop to one column each — there is no third to
 *  borrow. */
export const TwoColumns: Story = { args: { width: 800, label: "Main view, narrow" } };

/** One column: the 390px drawer and the preview overlay. The Details grid
 *  collapses to one column of label-over-value — the same component, not a
 *  different rendering — and every card is full width. */
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
