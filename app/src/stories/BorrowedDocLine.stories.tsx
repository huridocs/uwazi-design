import type { Meta, StoryObj } from "@storybook/react-vite";
import { BorrowedDocLine } from "../components/library/BorrowedDocLine";

/** `↳ from <document>` — the passages beside this line were quoted from a
 *  document the result does not own.
 *
 *  A case with no PDF of its own reads a connected judgment's, and the corpus
 *  ships six real files standing in for thousands of filenames — so hundreds of
 *  results can quote the SAME page of the SAME judgment. Unattributed that reads
 *  as a corpus of duplicates, or as a bug; attributed it reads as what it is,
 *  many cases citing one shared judgment.
 *
 *  It renders NOTHING for an entity's own document, which is why it must sit on
 *  a line that is mounted either way — a section label, a row's attribution —
 *  never a line of its own that appears and disappears under the reader. */
const meta = {
  title: "Library/BorrowedDocLine",
  component: BorrowedDocLine,
  parameters: { layout: "padded" },
} satisfies Meta<typeof BorrowedDocLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { from: { entityId: "e-1", title: "Caso Gelman vs. Uruguay · Sentencia de 24 de febrero de 2011" } },
};

/** No borrowed document — the entity owns what it quotes, and the line renders
 *  nothing at all. Shown beside the line it rides so the point is visible: the
 *  host line stays put either way. */
export const Empty: Story = {
  args: { from: null },
  render: () => (
    <div className="space-y-3 max-w-md">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
        Document
        <BorrowedDocLine from={null} />
      </p>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
        Document
        <BorrowedDocLine from={{ entityId: "e-2", title: "Velásquez-Rodríguez v. Honduras" }} />
      </p>
    </div>
  ),
};
