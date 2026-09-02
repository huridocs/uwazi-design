import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { MatchModeToggle, type MatchMode } from "../components/shared/MatchModeToggle";

/** The AND/OR segmented control that says how a facet's ticked values combine.
 *
 *  It replaced two separately-written copies — the drawer's `FacetSection`
 *  flavour and the Library keyword card's — which had drifted into the same
 *  pixels by coincidence, and neither of which named itself to a screen reader.
 *  What to check here: the two flavours differ only in whether the caption is
 *  showing, and the pressed segment is announced, not merely tinted. */
const meta = {
  title: "Shared/MatchModeToggle",
  component: MatchModeToggle,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MatchModeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

function Live({ label, groupLabel }: { label?: string; groupLabel?: string }) {
  const [mode, setMode] = useState<MatchMode>("OR");
  return <MatchModeToggle mode={mode} onChange={setMode} label={label} groupLabel={groupLabel} />;
}

/** The bare control — the Library keyword card's flavour, riding in a header row
 *  where the card title already says what is being matched. */
export const Default: Story = {
  args: { mode: "OR", onChange: () => {} },
  render: () => <Live groupLabel="Match mode for Countries" />,
};

/** With the visible caption — the filters drawer's flavour, where the control
 *  sits under a facet's header with nothing else naming it. */
export const WithLabel: Story = {
  args: { mode: "OR", onChange: () => {} },
  render: () => <Live label="Match" />,
};

/** Both states side by side, so the pressed treatment can be compared without
 *  clicking. The tint is the only visual difference; `aria-pressed` is what
 *  carries it to assistive tech. */
export const AllStates: Story = {
  args: { mode: "OR", onChange: () => {} },
  render: () => (
    <div className="flex flex-col gap-3">
      <MatchModeToggle mode="OR" onChange={() => {}} label="Match" />
      <MatchModeToggle mode="AND" onChange={() => {}} label="Match" />
    </div>
  ),
};
