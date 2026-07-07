import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LayoutGrid, List, Map } from "lucide-react";
import { SegmentedControl } from "../components/shared/SegmentedControl";

/** The view-modifier toggle: bordered segmented group, vellum active segment,
 *  aria-pressed per segment. Icon-only when segments carry icons. */

function IconDemo() {
  const [value, setValue] = useState("cards");
  return (
    <SegmentedControl
      value={value}
      onChange={setValue}
      options={[
        { id: "cards", label: "Cards", icon: LayoutGrid },
        { id: "list", label: "List", icon: List },
        { id: "map", label: "Map", icon: Map },
      ]}
    />
  );
}

function LabelDemo() {
  const [value, setValue] = useState("all");
  return (
    <SegmentedControl
      value={value}
      onChange={setValue}
      options={[
        { id: "all", label: "All" },
        { id: "unread", label: "Unread" },
      ]}
    />
  );
}

const meta = {
  title: "Shared/SegmentedControl",
  component: SegmentedControl,
  parameters: { layout: "centered" },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Icons: Story = {
  args: { value: "cards", options: [], onChange: () => {} },
  render: () => <IconDemo />,
};

export const Labels: Story = {
  args: { value: "all", options: [], onChange: () => {} },
  render: () => <LabelDemo />,
};
