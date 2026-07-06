import type { Meta, StoryObj } from "@storybook/react-vite";
import { PageTag } from "../components/shared/PageTag";
import { DirectionGlyph } from "../components/relationships/DirectionGlyph";

/** Micro-badges of the relationships surface: the mono `p.N` page tag (jumps
 *  the viewer) and the direction glyph (outgoing / incoming / bidirectional). */
const meta = {
  title: "Shared/PageTag & DirectionGlyph",
  component: PageTag,
  parameters: { layout: "centered" },
  args: { page: 100 },
} satisfies Meta<typeof PageTag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Page: Story = {};

export const Directions: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
        <DirectionGlyph direction="outgoing" /> outgoing
      </span>
      <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
        <DirectionGlyph direction="incoming" /> incoming
      </span>
      <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
        <DirectionGlyph direction="both" /> both
      </span>
    </div>
  ),
};
