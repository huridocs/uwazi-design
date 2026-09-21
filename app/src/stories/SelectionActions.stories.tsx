import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileDown, LayoutTemplate, Lock, Share2, Trash2 } from "lucide-react";
import { SelectionActionsMenu } from "../components/library/SelectionActionsMenu";
import { ChangeTemplateDialog } from "../components/library/ChangeTemplateDialog";
import { ShareEntityModal } from "../components/share/ShareEntityModal";
import { entityTypes } from "../data/entities";

/** The Library selection's actions: the drawer's Actions menu, the Change
 *  template dialog, and Share / Permissions over a selection. */
const meta = {
  title: "Library/SelectionActions",
  component: SelectionActionsMenu,
  parameters: { layout: "padded" },
  args: {
    actions: [
      { id: "change-template", label: "Change template", icon: <LayoutTemplate size={13} />, onClick: () => {} },
      { id: "export", label: "Export CSV", icon: <FileDown size={13} />, onClick: () => {} },
      { id: "share", label: "Share", icon: <Share2 size={13} />, onClick: () => {} },
      { id: "permissions", label: "Permissions", icon: <Lock size={13} />, onClick: () => {} },
      { id: "delete", label: "Delete", icon: <Trash2 size={13} />, onClick: () => {}, danger: true },
    ],
  },
  decorators: [(Story) => <div className="pt-56 flex justify-end max-w-sm">{Story()}</div>],
} satisfies Meta<typeof SelectionActionsMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A disabled action stays listed, saying why. */
export const WithDisabled: Story = {
  args: {
    actions: [
      {
        id: "change-template",
        label: "Change template",
        icon: <LayoutTemplate size={13} />,
        disabledReason: "No other template to change to",
      },
      { id: "export", label: "Export CSV", icon: <FileDown size={13} />, onClick: () => {} },
      { id: "delete", label: "Delete", icon: <Trash2 size={13} />, onClick: () => {}, danger: true },
    ],
  },
};

/** Change template over a Country and two Court Cases: pick a target to see
 *  what is kept, dropped and new. */
export const ChangeTemplate: Story = {
  render: () => <ChangeTemplateDialog ids={["e2", "e13", "e31"]} corpus="mock" types={entityTypes} onClose={() => {}} />,
};

/** Share over a selection: general access, members with coverage. */
export const ShareBulk: Story = {
  render: () => <ShareEntityModal open onClose={() => {}} ids={["e2", "e13", "e31"]} />,
};

/** Permissions: the same modal, focus on the people lookup. */
export const Permissions: Story = {
  render: () => <ShareEntityModal open onClose={() => {}} ids={["e2", "e13", "e31"]} initialFocus="people" />,
};
