import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ListCardRow } from "../components/shared/ListCardRow";
import { EntityPill } from "../components/shared/EntityPill";
import { PageTag } from "../components/shared/PageTag";

/** THE card-row shell for every list surface (refs, relationships, files,
 *  library list). Owns hover/focus/selected states — selected is ALWAYS
 *  `bg-parchment` (the canonical selected color; never introduce another).
 *  Keyboard-operable: div variant is role="button" + Enter/Space; button
 *  variant is a native button. `aria-pressed` mirrors selection. */
const meta = {
  title: "Shared/ListCardRow",
  component: ListCardRow,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ListCardRow>;

export default meta;
type Story = StoryObj<typeof meta>;

function RowDemo() {
  const [selected, setSelected] = useState(1);
  const rows = [
    { title: "Case 11.137 (La Tablada)", type: "court_case", page: 100 },
    { title: "Juan Carlos Abella", type: "person", page: 12 },
    { title: "Enforced Disappearance", type: "violation", page: 47 },
  ];
  return (
    <div className="max-w-md bg-paper border border-border rounded-lg overflow-hidden">
      {rows.map((r, i) => (
        <ListCardRow
          key={r.title}
          selected={selected === i}
          onClick={() => setSelected(i)}
          ariaLabel={r.title}
        >
          <div className="flex items-center justify-between gap-2">
            <EntityPill typeId={r.type} label={r.title} />
            <PageTag page={r.page} />
          </div>
        </ListCardRow>
      ))}
    </div>
  );
}

export const List: Story = {
  args: { selected: false, onClick: () => {}, children: null },
  render: () => <RowDemo />,
};

export const Selected: Story = {
  args: {
    selected: true,
    onClick: () => {},
    ariaLabel: "Selected row",
    children: (
      <span className="text-sm text-ink">
        Selected row — always <code className="text-carbon">bg-parchment</code>
      </span>
    ),
  },
  decorators: [
    (Story) => (
      <div className="max-w-md bg-paper border border-border rounded-lg overflow-hidden">
        <Story />
      </div>
    ),
  ],
};
