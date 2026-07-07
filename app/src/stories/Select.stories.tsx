import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "../components/shared/Select";

/** Calm borderless dropdown (bg-warm trigger, popover menu) — used wherever a
 *  native select would leak browser chrome. Options carry role="option" +
 *  aria-selected; Escape closes. */
const OPTIONS = [
  { value: "recent", label: "Date added" },
  { value: "title", label: "Title" },
  { value: "type", label: "Type" },
  { value: "connections", label: "Connections" },
];

function Demo({ align }: { align?: "start" | "end" }) {
  const [value, setValue] = useState("recent");
  return <Select value={value} options={OPTIONS} onChange={setValue} ariaLabel="Sort by" align={align} />;
}

const meta = {
  title: "Shared/Select",
  component: Select,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: "recent", options: OPTIONS, onChange: () => {} },
  render: () => <Demo />,
};

export const EndAligned: Story = {
  args: { value: "recent", options: OPTIONS, onChange: () => {} },
  render: () => <Demo align="end" />,
};
