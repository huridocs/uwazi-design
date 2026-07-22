import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ToggleChip } from "../components/shared/ToggleChip";

/** The toggleable sibling of `ActiveFilterChip` — identical chip (h-6, same
 *  radius, same `color-mix` off the REAL `--text-primary` var, logical ps/pe
 *  padding), one behaviour apart: it's a switch announcing `aria-pressed`, not a
 *  statement carrying an X. Off drops the fill and mutes the label, so an
 *  excluded slice reads as excluded without a second colour. */
const meta = {
  title: "Shared/ToggleChip",
  component: ToggleChip,
  parameters: { layout: "centered" },
  args: { label: "Document", count: 658, active: true, onToggle: () => {} },
} satisfies Meta<typeof ToggleChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Off: Story = { args: { active: false } };

export const WithoutCount: Story = { args: { count: undefined } };

export const WithColorDot: Story = { args: { label: "Court Case", color: "#00B4F0" } };

export const AllStates: Story = {
  render: () => {
    const [on, setOn] = useState<Record<string, boolean>>({
      title: true,
      properties: true,
      document: false,
    });
    return (
      <div className="flex items-center gap-1">
        <ToggleChip
          label="Title"
          count={3}
          active={on.title}
          onToggle={() => setOn((s) => ({ ...s, title: !s.title }))}
        />
        <ToggleChip
          label="Properties"
          count={63}
          active={on.properties}
          onToggle={() => setOn((s) => ({ ...s, properties: !s.properties }))}
        />
        <ToggleChip
          label="Document"
          count={658}
          active={on.document}
          onToggle={() => setOn((s) => ({ ...s, document: !s.document }))}
        />
      </div>
    );
  },
};
