import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConfirmDelete, type DeleteImpact } from "../components/shared/ConfirmDelete";

/** Settings' delete confirmation: the facts first (what the delete touches),
 *  then the question. Where Uwazi refuses the delete, the rule replaces the
 *  question and the only button is OK. */
const meta = {
  title: "Shared/ConfirmDelete",
  component: ConfirmDelete,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ConfirmDelete>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ impact, confirmWord }: { impact: DeleteImpact; confirmWord?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="h-96 flex items-center justify-center">
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
      >
        Open dialog
      </button>
      <ConfirmDelete
        open={open}
        title="Delete group"
        message="Delete the Research group?"
        impact={impact}
        confirmWord={confirmWord}
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

const base = { open: true, title: "", message: "", impact: null, onConfirm: () => {}, onCancel: () => {} };

export const Default: Story = {
  args: base,
  render: () => (
    <Demo impact={{ lines: ["2 members lose this group: jnkemba and afarah.", "Shared with 12 entities. That access is removed."], block: null }} />
  ),
};

export const Blocked: Story = {
  args: base,
  render: () => (
    <Demo impact={{ lines: ["Used by 337 entities."], block: "337 entities use this template. Move or delete them first." }} />
  ),
};

export const TypedConfirm: Story = {
  args: base,
  render: () => <Demo impact={{ lines: ["Interface translated: 94%."], block: null }} confirmWord="CONFIRM" />,
};
