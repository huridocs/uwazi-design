import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FolderInput, Shield, Trash2, Users } from "lucide-react";
import { SettingsSelectionBar } from "../components/settings/SettingsSelectionBar";
import { SettingsContent } from "../components/settings/SettingsContent";
import { SettingsButton } from "../components/settings/SettingsButton";

/** A settings footer's selected state: the count in a fixed slot, ghost
 *  actions, a hairline, the danger action, Clear. It takes the place of the
 *  footer's idle start group at the same height. On phones the actions sit
 *  behind one "Actions" button. */
const meta = {
  title: "Settings/SettingsSelectionBar",
  component: SettingsSelectionBar,
  parameters: { layout: "fullscreen" },
  args: {
    count: 3,
    total: 12,
    onClear: () => {},
    actions: [
      { id: "group", label: "Add to group", icon: <Users size={13} />, onClick: () => {} },
      { id: "role", label: "Change role", icon: <Shield size={13} />, onClick: () => {} },
      { id: "delete", label: "Delete", icon: <Trash2 size={13} />, onClick: () => {}, danger: true },
    ],
  },
  decorators: [
    (Story) => (
      <div className="h-40">
        <SettingsContent component="Demo">
          <SettingsContent.Body>
            <p className="text-xs text-ink-tertiary">Page body</p>
          </SettingsContent.Body>
          <SettingsContent.Footer>{Story()}</SettingsContent.Footer>
        </SettingsContent>
      </div>
    ),
  ],
} satisfies Meta<typeof SettingsSelectionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A disabled action stays focusable and says why. */
export const WithDisabled: Story = {
  args: {
    actions: [
      { id: "move", label: "Move to group", icon: <FolderInput size={13} />, disabledReason: "This thesaurus has no groups yet" },
      { id: "remove", label: "Remove", icon: <Trash2 size={13} />, onClick: () => {}, danger: true },
    ],
  },
};

/** In an editor footer: the selection on the start side, Cancel and Save
 *  keep their place on the end. */
export const InEditorFooter: Story = {
  render: (args) => {
    const [count, setCount] = useState(args.count);
    return (
      <>
        {count > 0 ? (
          <SettingsSelectionBar {...args} count={count} onClear={() => setCount(0)} />
        ) : (
          <span className="me-auto text-xs text-ink-tertiary">Nothing selected</span>
        )}
        <SettingsButton variant="ghost" size="sm">Cancel</SettingsButton>
        <SettingsButton variant="success" size="sm">Save</SettingsButton>
      </>
    );
  },
};
