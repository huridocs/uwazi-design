import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlphaJump } from "../components/shared/AlphaJump";

/** An A–Z index for a long list. Letters the list has none of are disabled;
 *  "#" covers labels that start with anything else. */
const meta = {
  title: "Shared/AlphaJump",
  component: AlphaJump,
  parameters: { layout: "padded" },
  args: { present: new Set([..."ABCDEGHIJLMNOPQRSTUVYZ"]), onJump: () => {} },
} satisfies Meta<typeof AlphaJump>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [last, setLast] = useState("");
    return (
      <div className="flex flex-col gap-3 max-w-lg">
        <AlphaJump {...args} onJump={setLast} />
        <p className="text-xs text-ink-tertiary">{last ? `Jumped to ${last}` : "Press a letter"}</p>
      </div>
    );
  },
};

export const Empty: Story = { args: { present: new Set() } };
