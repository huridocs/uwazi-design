import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pencil, Share2, Trash2 } from "lucide-react";
import { BarDivider } from "../components/shared/BarDivider";
import { BAR_DANGER, BAR_GHOST, WARM_BUTTON } from "../components/shared/warmButton";

/** The hairline between groups of actions in a bar, and the weight ladder it
 *  goes with (`warmButton.ts`): one filled lead, ghosts for the rest, Delete in
 *  seal text. Check both themes — the divider is `border-soft`. */
const meta = {
  title: "Shared/BarDivider",
  component: BarDivider,
  parameters: { layout: "padded" },
} satisfies Meta<typeof BarDivider>;

export default meta;
type Story = StoryObj<typeof meta>;

const button = "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors";

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-1 h-12 px-3 bg-paper border-t border-border">
      <span className="text-xs font-semibold text-ink tabular-nums me-2">3 selected</span>
      <button type="button" className={`${button} ${BAR_GHOST}`}>Clear</button>
      <BarDivider />
      <button type="button" className={`${button} ${WARM_BUTTON}`}>
        <Pencil size={13} className="text-ink-tertiary" aria-hidden /> Edit
      </button>
      <button type="button" className={`${button} ${BAR_GHOST}`}>
        <Share2 size={13} className="text-ink-tertiary" aria-hidden /> Share
      </button>
      <BarDivider />
      <button type="button" className={`${button} ${BAR_DANGER}`}>
        <Trash2 size={13} aria-hidden /> Delete
      </button>
    </div>
  ),
};
