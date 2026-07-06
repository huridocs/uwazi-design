import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusBadge } from "../components/shared/StatusBadge";
import type { ImportStatus } from "../data/imports";

/** Import-status badge — every state maps to a semantic tint pair
 *  (bg-*-light/tint + text-*). `w-fit` so it never stretches. */
const meta = {
  title: "Shared/StatusBadge",
  component: StatusBadge,
  parameters: { layout: "centered" },
  args: { status: "completed" },
  argTypes: {
    status: {
      control: "select",
      options: [
        "completed",
        "completed_warnings",
        "completed_errors",
        "processing",
        "uploading",
        "pending",
        "failed",
      ] satisfies ImportStatus[],
    },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2 max-w-md">
      {(
        ["completed", "completed_warnings", "completed_errors", "processing", "uploading", "pending", "failed"] as ImportStatus[]
      ).map((s) => (
        <StatusBadge key={s} status={s} />
      ))}
    </div>
  ),
};
