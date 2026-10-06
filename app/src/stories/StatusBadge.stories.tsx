import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusBadge } from "../components/shared/StatusBadge";
import type { CsvStatus } from "../data/imports";

const STATES: CsvStatus[] = [
  "queued",
  "validating",
  "extracting",
  "scanning",
  "thesauri",
  "relationships",
  "entities",
  "retrying",
  "completed",
  "failed",
  "cancelled",
];

/** Import-status badge: every state maps to a semantic tint pair
 *  (bg-*-light/tint + text-*-label). `w-fit` so it never stretches. */
const meta = {
  title: "Shared/StatusBadge",
  component: StatusBadge,
  parameters: { layout: "centered" },
  args: { status: "completed" },
  argTypes: {
    status: { control: "select", options: STATES },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2 max-w-md">
      {STATES.map((s) => (
        <StatusBadge key={s} status={s} />
      ))}
      <StatusBadge status="completed" rowsFailed={2} />
    </div>
  ),
};
