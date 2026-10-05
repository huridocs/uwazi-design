import type { Meta, StoryObj } from "@storybook/react-vite";
import { BulkPickModal } from "../components/settings/BulkPickModal";

/** One choice applied to a selection (Add to group, Change role, Move to
 *  group): a radio list, then a readback of what the choice changes, and
 *  what it leaves alone and why, before it is applied. */
const meta = {
  title: "Settings/BulkPickModal",
  component: BulkPickModal,
  parameters: { layout: "fullscreen" },
  args: {
    title: "Change role",
    subtitle: "3 users",
    confirmLabel: "Change role",
    options: [
      { value: "admin", label: "Admin" },
      { value: "editor", label: "Editor" },
      { value: "collaborator", label: "Collaborator" },
    ],
    readback: (v: string) =>
      v === "collaborator"
        ? { text: "2 users become Collaborator. admin stays: This is the last admin, so the role stays Admin." }
        : v === "admin"
          ? { text: "All 3 users are already Admin.", none: true }
          : { text: "3 users become Editor." },
    onConfirm: () => {},
    onClose: () => {},
  },
} satisfies Meta<typeof BulkPickModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Past eight options the list takes a search. */
export const WithSearch: Story = {
  args: {
    title: "Move to group",
    subtitle: "12 values",
    confirmLabel: "Move",
    options: ["No group (top level)", "El Salvador", "Guatemala", "Honduras", "México", "Nicaragua", "Costa Rica", "Panamá", "Belice", "Colombia"].map((l, i) => ({ value: String(i), label: l })),
    readback: () => ({ text: "Moves 12 values into Guatemala." }),
  },
};
