import type { Meta, StoryObj } from "@storybook/react-vite";
import { Hint } from "../components/shared/Hint";

/** The one-line hint shown above an element on hover AND keyboard focus,
 *  portalled to `body`. Tab to the button to see it without a pointer. */
const meta = {
  title: "Shared/Hint",
  component: Hint,
  parameters: { layout: "centered" },
  args: { text: "Go to page 14", children: () => null },
} satisfies Meta<typeof Hint>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Hint text={args.text} describe={false}>
      {(hint) => (
        <button
          {...hint}
          type="button"
          aria-label={args.text}
          className="rounded-sm text-meta uppercase tracking-wide text-ink-tertiary hover:underline
            focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
        >
          Document
        </button>
      )}
    </Hint>
  ),
};

export const OnText: Story = {
  args: { text: "4 matches on this page" },
  render: (args) => (
    <Hint text={args.text}>
      {(hint) => (
        <span {...hint} className="text-meta tabular-nums text-ink-tertiary">
          4 matches
        </span>
      )}
    </Hint>
  ),
};
