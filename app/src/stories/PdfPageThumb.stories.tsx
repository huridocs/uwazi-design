import type { Meta, StoryObj } from "@storybook/react-vite";
import { PdfPageThumb } from "../components/shared/PdfPageThumb";

/** A document preview: page one of the real PDF, inside the cropped-sheet frame.
 *
 *  It shows the WHOLE first page fitted to the sheet's width. A masthead crop
 *  was tried — page zoomed 1.8× and cropped to the sheet, which made the court,
 *  case and date genuinely legible — and was rejected on sight: it read as a
 *  fragment jammed against the top edge rather than as a document. A small
 *  honest page beats a big illegible detail, because recognising "this is a
 *  court judgment" is what a card thumbnail is for.
 *
 *  The page is rasterised only once the thumb is ON SCREEN, and cached per
 *  (url, width) — a grid of fifty cards sharing two judgments costs two renders.
 *  Note pdf.js will not resolve a render while the tab is hidden, so a thumb in
 *  a background tab stays a blank sheet until you look at it. */
const meta = {
  title: "Shared/PdfPageThumb",
  component: PdfPageThumb,
  parameters: { layout: "padded" },
} satisfies Meta<typeof PdfPageThumb>;

export default meta;
type Story = StoryObj<typeof meta>;

const URL = "/docs/Velasquez-Rodriguez_v_Honduras_Judgment_1988_EN.pdf";

/** The card grid's real geometry: a 281×94 frame whose sheet insets to
 *  ~189×97 CSS px. */
export const Default: Story = {
  args: { url: URL, ext: "pdf" },
  render: (args) => (
    <div className="w-[17.5rem] h-24 rounded overflow-hidden border border-border/60">
      <PdfPageThumb {...args} />
    </div>
  ),
};

/** No url — the frame holds a blank sheet. That IS the placeholder, and it
 *  holds the same geometry as a loaded page, so nothing shifts when the bitmap
 *  lands. It is also what a failed render looks like, which is why a blank card
 *  is invisible to the eye and needs `npm run check:thumbs` to catch. */
export const Empty: Story = {
  args: { ext: "pdf" },
  render: (args) => (
    <div className="w-[17.5rem] h-24 rounded overflow-hidden border border-border/60">
      <PdfPageThumb {...args} />
    </div>
  ),
};

/** The three sizes it ships at: the list row's 36px square, the card's band, and
 *  the metadata card's portrait box. At `sm` nothing is legible at any treatment
 *  — a page silhouette is the honest picture there. */
export const AllStates: Story = {
  args: { url: URL },
  render: () => (
    <div className="flex items-end gap-4">
      <div className="w-9 h-9 rounded overflow-hidden">
        <PdfPageThumb url={URL} size="sm" />
      </div>
      <div className="w-[17.5rem] h-24 rounded overflow-hidden border border-border/60">
        <PdfPageThumb url={URL} ext="pdf" />
      </div>
      <PdfPageThumb
        url={URL}
        ext="pdf"
        size="lg"
        className="block shrink-0 rounded overflow-hidden"
        style={{ width: 104, height: 118, border: "1px solid var(--border-primary)" }}
      />
    </div>
  ),
};
