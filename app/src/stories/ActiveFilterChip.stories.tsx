import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActiveFilterChip } from "../components/shared/ActiveFilterChip";

/** Active-filter chip: color-mix pill on the REAL `--text-primary` var (never
 *  a bridge alias — `var(--ink)` inside color-mix is invalid CSS and drops the
 *  whole background). Optional square dot carries an entity-type colour. */
const meta = {
  title: "Shared/ActiveFilterChip",
  component: ActiveFilterChip,
  parameters: { layout: "centered" },
  args: { label: "Causa", onRemove: () => {} },
} satisfies Meta<typeof ActiveFilterChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithColorDot: Story = {
  args: { label: "Court Case", color: "#00B4F0" },
};

export const LongLabelTruncates: Story = {
  args: { label: "Tortura y tratos crueles, inhumanos o degradantes" },
};
