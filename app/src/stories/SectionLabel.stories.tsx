import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText, Tag } from "lucide-react";
import { SectionLabel } from "../components/shared/SectionLabel";

/** The small uppercase label introducing a group of content.
 *
 *  It replaced four separately-written components of the same name, which
 *  agreed on size and weight and on nothing else — so the thing to check here
 *  is that every variant below differs only in its BOX (padding, a sticky
 *  ground, a leading glyph) and never in its type. */
const meta = {
  title: "Shared/SectionLabel",
  component: SectionLabel,
  parameters: { layout: "padded" },
} satisfies Meta<typeof SectionLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Properties" },
};

/** With a leading glyph, drawn a step quieter than the words so it reads as
 *  punctuation rather than content. */
export const WithIcon: Story = {
  args: { icon: <Tag size={11} />, children: "Properties" },
};

/** The two labels as they actually appear — one group above another. This is
 *  the pair that used to render in two different colours depending on which
 *  surface you were looking at. */
export const Stacked: Story = {
  args: { children: "Properties" },
  render: () => (
    <div className="w-[22rem] space-y-3">
      <div className="space-y-1">
        <SectionLabel icon={<Tag size={11} />}>Properties</SectionLabel>
        <p className="text-xs text-ink-secondary">Country · Chile</p>
      </div>
      <div className="space-y-1">
        <SectionLabel icon={<FileText size={11} />}>Document</SectionLabel>
        <p className="text-xs text-ink-secondary">…the Court found that the State…</p>
      </div>
    </div>
  ),
};

/** The caller owns the box: here a sticky ground, the notification drawer's
 *  flavour. Scroll the panel — the label holds at the top of its group. */
export const Sticky: Story = {
  args: { children: "Today" },
  render: () => (
    <div className="w-[22rem] h-40 overflow-auto bg-warm rounded-md">
      <SectionLabel className="sticky top-0 z-10 bg-warm px-4 pt-3 pb-1.5">
        Tasks · 3
      </SectionLabel>
      <ul className="px-4 pb-3 space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="text-xs text-ink-secondary">
            Reprocessing document {i + 1}
          </li>
        ))}
      </ul>
    </div>
  ),
};

/** A long label with nowhere to go — it truncates inside its own row rather
 *  than pushing the container open. */
export const Overflow: Story = {
  args: { children: "A section label long enough to need somewhere to stop" },
  render: () => (
    <div className="w-40 border border-border rounded-md p-2">
      <SectionLabel className="[&>*]:truncate">
        <span>A section label long enough to need somewhere to stop</span>
      </SectionLabel>
    </div>
  ),
};
