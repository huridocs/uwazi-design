import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MoveButtons, ReorderGrip, moveTo } from "../components/settings/ReorderControls";

/** Keyboard reordering for settings rows. The grip is a button: focused,
 *  ArrowUp / ArrowDown move the row, Home / End send it to either end, and
 *  focus stays with it. Move up / Move down sit with the row's actions.
 *  Inside a Settings page the new position is announced. */
const meta = {
  title: "Settings/ReorderControls",
  component: ReorderGrip,
  parameters: { layout: "padded" },
  args: { label: "Item", index: 0, count: 1, onMove: () => {} },
} satisfies Meta<typeof ReorderGrip>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const [rows, setRows] = useState(["Main menu", "About", "Cases", "Contact"]);
  return (
    <ul className="max-w-sm flex flex-col divide-y divide-border-soft bg-paper rounded-md border border-border-soft">
      {rows.map((r, i) => {
        const props = { label: r, index: i, count: rows.length, onMove: (to: number) => setRows((p) => moveTo(p, i, to)) };
        return (
          <li key={r} className="group flex items-center gap-2 px-3 h-10">
            <ReorderGrip {...props} />
            <span className="flex-1 text-sm text-ink">{r}</span>
            <MoveButtons {...props} />
          </li>
        );
      })}
    </ul>
  );
}

export const Default: Story = { render: () => <Demo /> };
