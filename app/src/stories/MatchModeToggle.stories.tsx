import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { MatchModeToggle, type MatchMode } from "../components/shared/MatchModeToggle";

/** The AND/OR segmented control that says how a facet's ticked values combine.
 *
 *  It replaced two separately-written copies — the drawer's `FacetSection`
 *  flavour and the Library keyword card's — which had drifted into the same
 *  pixels by coincidence, and neither of which named itself to a screen reader.
 *  What to check here: the two flavours differ only in whether the caption is
 *  showing, and the pressed segment is announced, not merely tinted.
 *
 *  Every story sits on `bg-paper`, which is the ground the control actually
 *  ships on (the filters drawer's) — a story floating on Storybook's own
 *  backdrop measures a contrast that nothing renders. Flip the toolbar to DARK
 *  to check it: dark is the binding case for this palette, and the caption's
 *  original `-muted` ink passed nothing anywhere — 4.48:1 light, 2.91:1 dark. */
const meta = {
  title: "Shared/MatchModeToggle",
  component: MatchModeToggle,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MatchModeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The drawer's ground, so the a11y addon measures what ships. */
function OnPaper({ children }: { children: React.ReactNode }) {
  return <div className="bg-paper p-4 rounded-md">{children}</div>;
}

function Live({ label, groupLabel }: { label?: string; groupLabel?: string }) {
  const [mode, setMode] = useState<MatchMode>("OR");
  return (
    <OnPaper>
      <MatchModeToggle mode={mode} onChange={setMode} label={label} groupLabel={groupLabel} />
    </OnPaper>
  );
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
 *  carries it to assistive tech.
 *
 *  This is also the contrast check. Four inks are in play and all four clear AA
 *  at 11px in BOTH themes: caption `ink-tertiary` on paper (7.46 / 5.52), idle
 *  segment `ink-tertiary` on warm (7.16 / 5.10), hovered `ink-secondary` on
 *  warm (12.13 / 9.04), picked `ink` on vellum (15.00 / 11.14). Light first,
 *  dark second — and dark is the one to watch. */
export const AllStates: Story = {
  args: { mode: "OR", onChange: () => {} },
  render: () => (
    <OnPaper>
      <div className="flex flex-col gap-3">
        <MatchModeToggle mode="OR" onChange={() => {}} label="Match" />
        <MatchModeToggle mode="AND" onChange={() => {}} label="Match" />
      </div>
    </OnPaper>
  ),
};
