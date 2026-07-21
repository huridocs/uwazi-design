import type { Meta, StoryObj } from "@storybook/react-vite";
import { HighlightedText } from "../components/shared/HighlightedText";

/** Wraps every case-insensitive match of `query` in the shared search-highlight
 *  `<mark>`. The mark paints the highlight token WITHOUT shifting layout
 *  (`px-0.5` cancelled by `-mx-0.5`, no weight change), so a highlighted line
 *  wraps identically to a plain one. Empty query → text unchanged. */
const meta = {
  title: "Shared/HighlightedText",
  component: HighlightedText,
  parameters: { layout: "centered" },
  args: { text: "Case 12.045 (Velásquez Rodríguez)", query: "Velásquez" },
} satisfies Meta<typeof HighlightedText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** No query → renders the text verbatim (drop-in for a bare `{text}`). */
export const NoQuery: Story = {
  args: { query: "" },
};

/** Multiple matches of a single term, all marked. */
export const MultipleMatches: Story = {
  args: { text: "the case, this case, and that case", query: "case" },
};

/** Multi-word query — tokenised like the matcher, so EACH word is marked wherever
 *  it appears (not only the exact phrase). `AND`/`OR`/`NOT` are dropped, and a
 *  `"quoted phrase"` is treated as one unit. */
export const MultiWordTokens: Story = {
  args: {
    text: "Alegó tortura y otros tratos crueles; la tortura psicológica quedó probada.",
    query: "tortura psicológica",
  },
};

/** Wrapping parity: the same paragraph plain vs. highlighted — line breaks land
 *  in the same places because the mark adds no width and no weight. */
export const WrappingParity: Story = {
  render: () => {
    const text =
      "The Inter-American Court of Human Rights found the State responsible in the case of Velásquez Rodríguez v. Honduras.";
    return (
      <div className="flex flex-col gap-4 max-w-[22rem] text-sm text-ink leading-relaxed">
        <p>{text}</p>
        <p>
          <HighlightedText text={text} query="the" />
        </p>
      </div>
    );
  },
};

/** RTL — the mark's symmetric negative margin keeps Arabic text intact. */
export const RTL: Story = {
  render: () => (
    <p dir="rtl" className="text-sm text-ink leading-relaxed max-w-[22rem]">
      <HighlightedText text="محكمة البلدان الأمريكية لحقوق الإنسان" query="الإنسان" />
    </p>
  ),
};
