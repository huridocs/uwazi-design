import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ViewSwitcher } from "../components/library/ViewSwitcher";

/** The Library's view switcher: the same dropdown Sort and Language use, so the
 *  toolbar reads as three of one control rather than two dropdowns flanking a
 *  segmented widget.
 *
 *  It is the compact end of a trade settled over three treatments. Five segments
 *  hold a fixed 156px whatever they show; this trigger holds the widest label
 *  once (124.55px) and names the active view, which bare icons never did. What
 *  it costs is the one-click switch — every view is still reachable, through a
 *  menu.
 *
 *  The width is constant across views because `Select`'s `steady` reserves the
 *  widest option: this row is Sort · View · Display · Language, and a trigger
 *  that resized with its value would shove every control beside it. */
const meta = {
  title: "Library/ViewSwitcher",
  component: ViewSwitcher,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ViewSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ initial = "cards" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <ViewSwitcher value={value} onChange={setValue} />;
}

export const Default: Story = {
  args: { value: "cards", onChange: () => {} },
  render: () => <Demo />,
};

/** Every view as the active one. The point of the row is that all five triggers
 *  are the SAME width — the longest label ("Timeline") is reserved whichever is
 *  showing, so switching view moves nothing beside it. */
export const AllStates: Story = {
  args: { value: "cards", onChange: () => {} },
  render: () => (
    <div className="flex flex-col items-start gap-2">
      {["cards", "list", "map", "timeline", "results"].map((v) => (
        <Demo key={v} initial={v} />
      ))}
    </div>
  ),
};
