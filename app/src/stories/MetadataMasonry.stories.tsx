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
 *  1. **Short scalars** — a date, a country, a case number — come first, each
 *     its own card as every field is. They are one line apiece, so at three
 *     columns they tile three-across and the band reads as a block of facts.
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

/** Three columns: the scalars tiling three-across at the top, Description two
 *  columns wide with a scalar filling the third beside it (that is `dense`
 *  working), and Rights invoked beside Articles invoked. */
export const Default: Story = { args: { width: 1120, label: "Main view, wide" } };

/** Two columns: scalars tile two-across and the long cards drop to one column
 *  each — there is no third to borrow. */
export const TwoColumns: Story = { args: { width: 800, label: "Main view, narrow" } };

/** One column: the 390px drawer and the preview overlay. Every card is full
 *  width and the bands simply stack — same components, no second rendering. */
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
