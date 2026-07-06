import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "../components/shared/Checkbox";

/** The one shared native checkbox. Tone "ink" is the app default; filter
 *  facets use "carbon". Dark mode works because index.css sets
 *  `:root.dark { color-scheme: dark }` — native controls follow. */
const meta = {
  title: "Shared/Checkbox",
  component: Checkbox,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ tone, disabled }: { tone?: "ink" | "carbon"; disabled?: boolean }) {
  const [checked, setChecked] = useState(true);
  return (
    <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
      <Checkbox
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        ariaLabel="Demo checkbox"
        tone={tone}
        disabled={disabled}
      />
      {tone === "carbon" ? "Carbon tone (filters)" : "Ink tone (default)"}
    </label>
  );
}

export const Ink: Story = {
  args: { checked: true, onChange: () => {} },
  render: () => <Demo />,
};

export const Carbon: Story = {
  args: { checked: true, onChange: () => {} },
  render: () => <Demo tone="carbon" />,
};

export const Disabled: Story = {
  args: { checked: true, onChange: () => {}, disabled: true, ariaLabel: "Disabled" },
};
