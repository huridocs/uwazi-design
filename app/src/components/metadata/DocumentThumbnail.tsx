import { DocPlaceholder } from "../shared/DocPlaceholder";

/** The Document card's preview on the Metadata view.
 *
 *  Was a grey box with the word "PDF" centred in it — a picture of a file type
 *  next to a filename that already ended in .pdf. Now it's the same cropped sheet
 *  the Library cards use, at card size, so the two surfaces show one idea of what
 *  a document looks like. */
export function DocumentThumbnail({ ext = "pdf", width = 96 }: { ext?: string; width?: number }) {
  return (
    <div
      className="hidden md:block shrink-0 rounded overflow-hidden"
      style={{ width, height: Math.round(width * 1.33), border: "1px solid var(--border-primary)" }}
    >
      <DocPlaceholder ext={ext} size="lg" />
    </div>
  );
}
