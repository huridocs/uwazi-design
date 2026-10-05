import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsBarContext, SettingsButton } from "../components/settings/SettingsButton";

/** The Settings button on the bar ladder. Inside a settings footer
 *  (`SettingsBarContext`) each variant takes its bar rung; in a page body
 *  primary and secondary keep the warm fill. */
const meta = {
  title: "Settings/SettingsButton",
  component: SettingsButton,
  parameters: { layout: "padded" },
  args: { variant: "primary", size: "sm", children: "Add template" },
} satisfies Meta<typeof SettingsButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <SettingsBarContext.Provider value={true}>
        <div className="flex flex-wrap items-center gap-2">
          <SettingsButton variant="primary" size="sm">Add template</SettingsButton>
          <SettingsButton variant="ghost" size="sm">Cancel</SettingsButton>
          <SettingsButton variant="danger" size="sm">Delete</SettingsButton>
          <SettingsButton variant="commit" size="sm">Create template</SettingsButton>
          <SettingsButton variant="success" size="sm">Save</SettingsButton>
          <SettingsButton variant="success" size="sm" disabled>Save</SettingsButton>
        </div>
      </SettingsBarContext.Provider>
      <div className="flex flex-wrap items-center gap-2">
        <SettingsButton variant="primary" size="sm">Add value</SettingsButton>
        <SettingsButton variant="secondary" size="sm">Translate</SettingsButton>
        <SettingsButton variant="danger" size="sm">Disable</SettingsButton>
        <SettingsButton variant="secondary" size="sm" disabled>Disabled</SettingsButton>
        <SettingsButton variant="secondary" size="md">Medium</SettingsButton>
      </div>
    </div>
  ),
};
