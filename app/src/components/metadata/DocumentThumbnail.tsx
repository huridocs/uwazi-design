import { useAtomValue } from "jotai";
import { languageAtom } from "../../atoms/language";
import { filesAtom, documentGroupsAtom, activePrimaryGroupIdAtom } from "../../atoms/files";
import { resolvePrimaryFile } from "../../data/files";
import { PdfPageThumb } from "../shared/PdfPageThumb";

/** The Metadata Document card's preview — the document's own first page, in the
 *  same cropped frame the Library cards use. Resolved through the SAME primary-file
 *  path as the viewer, so the page you see is the page View opens. */
export function DocumentThumbnail({ width = 96 }: { width?: number }) {
  const language = useAtomValue(languageAtom);
  const files = useAtomValue(filesAtom);
  const groups = useAtomValue(documentGroupsAtom);
  const activeGroupId = useAtomValue(activePrimaryGroupIdAtom);

  const file = resolvePrimaryFile(files, groups, activeGroupId, language);

  return (
    <PdfPageThumb
      url={file?.url}
      ext={file?.type}
      size="lg"
      className="hidden md:block shrink-0 rounded overflow-hidden"
      style={{
        width,
        height: Math.round(width * 1.33),
        border: "1px solid var(--border-primary)",
      }}
    />
  );
}
