import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatsCard } from "../components/shared/StatsCard";

/** One dashboard figure. With `onOpen` the card is a button to where the
 *  figure comes from; without it, plain text. */
const meta = {
  title: "Settings/StatsCard",
  component: StatsCard,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StatsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Storage", value: "1.50 GB", caption: "Files and database usage" },
};

export const AsLink: Story = {
  args: {
    label: "Users",
    value: 5,
    caption: "total users",
    detail: "1 Admins | 2 Editors | 2 Collaborators",
    onOpen: () => {},
  },
};

export const Minimal: Story = {
  args: { label: "Entities", value: 42 },
};
