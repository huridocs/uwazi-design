import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PasswordConfirmModal } from "../components/shared/PasswordConfirmModal";

/** The current-password check before an account change (G15). Accept stays
 *  off until something is typed; the mock accepts any password. */
const meta = {
  title: "Shared/PasswordConfirmModal",
  component: PasswordConfirmModal,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PasswordConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const [open, setOpen] = useState(true);
  return (
    <div className="h-96 flex items-center justify-center">
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
      >
        Open dialog
      </button>
      <PasswordConfirmModal open={open} onAccept={() => setOpen(false)} onCancel={() => setOpen(false)} />
    </div>
  );
}

export const Default: Story = {
  args: { open: true, onAccept: () => {}, onCancel: () => {} },
  render: () => <Demo />,
};
