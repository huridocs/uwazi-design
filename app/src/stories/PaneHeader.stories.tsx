import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PaneHeader } from "../components/layout/PaneHeader";
import { MainTabs } from "../components/layout/MainTabs";
import { SectionLabel } from "../components/shared/SectionLabel";

/** The header of a main pane: identity and primary zone on row 1, the page's
 *  views as a tab strip with the secondary controls on row 2. The thing to check
 *  is that both grounds carry the same two rows and one rule, and that narrowing
 *  the frame folds the tabs into a select without moving the identity. */
const meta = {
  title: "Layout/PaneHeader",
  component: PaneHeader,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PaneHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const TABS = [
  { id: "cards", label: "Cards" },
  { id: "list", label: "List" },
  { id: "map", label: "Map" },
  { id: "timeline", label: "Timeline" },
];

function Demo({ ground, width }: { ground: "paper" | "parchment"; width?: string }) {
  const [active, setActive] = useState("cards");
  return (
    <div data-gutter-host className="gutter-host bg-paper" style={{ width }}>
      <PaneHeader ground={ground}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="shrink-0 w-[16rem] min-w-0 flex flex-col justify-center h-9">
            <h1 className="text-sm font-semibold leading-tight text-ink truncate">Collection</h1>
            <p className="h-4 text-meta tabular-nums text-ink-tertiary">4,398 entities</p>
          </div>
          <div className="flex-1 basis-[16rem] min-w-[11rem] h-8 rounded-md border border-border bg-paper px-2 flex items-center">
            <SectionLabel as="span">Primary zone</SectionLabel>
          </div>
        </div>
        <MainTabs tabs={TABS} activeId={active} onChange={setActive} />
      </PaneHeader>
    </div>
  );
}

export const Default: Story = {
  args: { children: null },
  render: () => <Demo ground="paper" />,
};

export const Parchment: Story = {
  args: { children: null },
  render: () => <Demo ground="parchment" />,
};

/** At 22rem the primary zone has dropped under the identity and the tabs have
 *  folded into one select. */
export const Narrow: Story = {
  args: { children: null },
  render: () => <Demo ground="paper" width="22rem" />,
};
