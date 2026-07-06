import type { Meta, StoryObj } from "@storybook/react-vite";
import { FiltersButton } from "../components/shared/FiltersButton";

/** Toolbar filters trigger. Idle = warm; with active filters = vellum + count
 *  badge + aria-pressed. size="sm" (h-6) for drawer toolbars, "md" (h-8) main. */
const meta = {
  title: "Shared/FiltersButton",
  component: FiltersButton,
  parameters: { layout: "centered" },
  args: { activeCount: 0, onClick: () => {}, size: "md" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md"] },
    activeCount: { control: { type: "number", min: 0, max: 12 } },
  },
} satisfies Meta<typeof FiltersButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const WithActiveFilters: Story = {
  args: { activeCount: 3 },
};

export const SmallDrawerFlavour: Story = {
  args: { activeCount: 1, size: "sm" },
};
