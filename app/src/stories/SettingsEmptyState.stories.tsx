import type { Meta, StoryObj } from "@storybook/react-vite";
import { LayoutTemplate } from "lucide-react";
import { SettingsEmptyState } from "../components/settings/SettingsEmptyState";

/** What a settings list shows with no rows: the object named, one line on
 *  what it is for, and the create action. With a live search it says nothing
 *  matched and offers to clear the search instead. */
const meta = {
  title: "Settings/SettingsEmptyState",
  component: SettingsEmptyState,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-xl rounded-md bg-paper py-10 px-4 border border-border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SettingsEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: <LayoutTemplate size={16} />,
    title: "No templates yet",
    hint: "A template lists the properties an entity of one type carries.",
    action: { label: "Add template", onClick: () => {} },
  },
};

export const NoMatch: Story = {
  args: { title: "No templates yet", query: "zzz", onClearQuery: () => {} },
};

export const Minimal: Story = {
  args: { title: "No suggestions in this view" },
};
