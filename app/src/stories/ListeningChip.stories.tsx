import type { Meta, StoryObj } from "@storybook/react-vite";
import { ListeningChip } from "../components/metadata/ListeningChip";

/** The mark on a metadata field armed for click-to-fill — the field is waiting
 *  for a value from somewhere else on screen.
 *
 *  It rides the field's LABEL ROW, which is already mounted and whose height the
 *  bold label sets, so arming and disarming move nothing. The dot carries the
 *  state; the words carry the instruction, because "listening" alone still
 *  leaves a reader guessing what the field wants. */
const meta = {
  title: "Metadata/ListeningChip",
  component: ListeningChip,
  parameters: { layout: "padded" },
  args: { label: "Description", onStop: () => {} },
} satisfies Meta<typeof ListeningChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** In place: the label row it rides, and the input keeping its focus ring while
 *  blurred — you left the field on purpose, to go and fetch the value. */
export const AllStates: Story = {
  render: (args) => (
    <div className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <label htmlFor="story-description" className="text-sm font-bold text-ink">
            Description
          </label>
          <ListeningChip {...args} label="Description" />
        </div>
        <textarea
          id="story-description"
          readOnly
          rows={3}
          placeholder="Select a passage in the document to fill this…"
          className="w-full px-3 py-2 text-sm text-ink bg-paper rounded-md border ring-2
            ring-carbon/20 border-carbon/40 resize-none placeholder:text-ink-muted"
        />
      </div>
      {/* The same field, not listening — the row is the same height, and the
          only thing that changed is the input's resting border. */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <label htmlFor="story-case-number" className="text-sm font-bold text-ink">
            Case number
          </label>
        </div>
        <input
          id="story-case-number"
          readOnly
          value="10.488"
          className="w-full px-3 py-2 text-sm text-ink bg-paper rounded-md border border-border"
        />
      </div>
    </div>
  ),
};
