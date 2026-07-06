import type { Meta, StoryObj } from "@storybook/react-vite";
import { FadeTruncate } from "../components/shared/FadeTruncate";

const QUOTE =
  "The Inter-American Court of Human Rights, composed of the following judges, delivers the present judgment in the case of Velásquez Rodríguez versus the State of Honduras, submitted by the Inter-American Commission on Human Rights, concerning the detention and subsequent disappearance of Angel Manfredo Velásquez Rodríguez.";

/** Line-clamped snippet with a bottom fade instead of an ellipsis. `fadeTo`
 *  must be a REAL background var matching the surface it sits on (default
 *  --bg-surface) — a hex here would break dark mode. */
const meta = {
  title: "Shared/FadeTruncate",
  component: FadeTruncate,
  parameters: { layout: "padded" },
  args: {
    text: QUOTE,
    maxLines: 2,
    className: "text-xs text-ink-secondary leading-relaxed",
  },
} satisfies Meta<typeof FadeTruncate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoLines: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-sm bg-paper border border-border rounded-lg p-3">
        <Story />
      </div>
    ),
  ],
};

export const Expandable: Story = {
  args: { expandable: true, maxLines: 3 },
  decorators: [
    (Story) => (
      <div className="max-w-sm bg-paper border border-border rounded-lg p-3">
        <Story />
      </div>
    ),
  ],
};
