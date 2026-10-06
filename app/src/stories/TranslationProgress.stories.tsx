import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TranslationProgress } from "../components/settings/TranslationProgress";

/** Per-language translation progress. The strip heads the Translations
 *  editor (a language is a button that filters to its gaps); the compact
 *  form sits in a list row. */
const progress = [
  { key: "es", label: "Spanish", done: 8, total: 10 },
  { key: "fr", label: "French", done: 10, total: 10 },
  { key: "ar", label: "Arabic", done: 3, total: 10 },
  { key: "pt", label: "Portuguese", done: 0, total: 10 },
];

const meta = {
  title: "Settings/TranslationProgress",
  component: TranslationProgress,
  parameters: { layout: "padded" },
  args: { progress },
} satisfies Meta<typeof TranslationProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [active, setActive] = useState("");
    return (
      <div className="max-w-2xl">
        <TranslationProgress {...args} active={active} onPick={(k) => setActive(active === k ? "" : k)} />
      </div>
    );
  },
};

export const Compact: Story = { args: { variant: "compact" } };
