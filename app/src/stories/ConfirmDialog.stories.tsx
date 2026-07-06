import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";

/** Shared confirm dialog (17 call sites). Danger variant = seal icon well +
 *  seal confirm button (Seal is danger ONLY); default variant confirms in ink.
 *  Escape cancels; the close button carries aria-label. */
const meta = {
  title: "Shared/ConfirmDialog",
  component: ConfirmDialog,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function DialogDemo({ variant }: { variant: "danger" | "default" }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="h-96 flex items-center justify-center">
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
      >
        Open dialog
      </button>
      <ConfirmDialog
        open={open}
        title={variant === "danger" ? "Delete Import" : "Apply changes"}
        message={
          variant === "danger"
            ? "Are you sure you want to delete violations.csv? This action cannot be undone."
            : "Apply the template changes to all 337 entities?"
        }
        confirmLabel={variant === "danger" ? "Delete" : "Apply"}
        variant={variant}
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

export const Danger: Story = {
  args: { open: true, title: "", message: "", onConfirm: () => {}, onCancel: () => {} },
  render: () => <DialogDemo variant="danger" />,
};

export const Default: Story = {
  args: { open: true, title: "", message: "", onConfirm: () => {}, onCancel: () => {} },
  render: () => <DialogDemo variant="default" />,
};
