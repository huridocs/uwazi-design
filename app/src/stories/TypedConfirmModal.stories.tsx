import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TypedConfirmModal } from "../components/shared/TypedConfirmModal";

/** Uwazi's type-the-word confirmation: a warning band, the message, what the
 *  action changes, then "Please type in CONFIRM:". The accept button stays off
 *  until the word is typed exactly. */
const meta = {
  title: "Shared/TypedConfirmModal",
  component: TypedConfirmModal,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TypedConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ impact, confirmLabel }: { impact?: string[]; confirmLabel: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="h-96 flex items-center justify-center">
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
      >
        Open dialog
      </button>
      <TypedConfirmModal
        open={open}
        message="You are about to uninstall a language."
        impact={impact}
        confirmLabel={confirmLabel}
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

const base = { open: true, message: "", confirmLabel: "", onConfirm: () => {}, onCancel: () => {} };

export const Default: Story = {
  args: base,
  render: () => (
    <Demo impact={["4 entities have a version in this language.", "18 translated keys are removed."]} confirmLabel="Uninstall" />
  ),
};

export const Minimal: Story = {
  args: base,
  render: () => <Demo confirmLabel="Reset" />,
};
