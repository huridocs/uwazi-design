import { useMemo } from "react";
import { FileText } from "lucide-react";
import { useAtomValue } from "jotai";
import { languageAtom } from "../../atoms/language";
import { filesAtom, documentGroupsAtom, activePrimaryGroupIdAtom } from "../../atoms/files";
import { PdfPageThumb } from "../shared/PdfPageThumb";

/** First page of the entity's actual document, on the Metadata Document card.
 *
 *  This was a grey box with the word "PDF" in it — a picture of a file TYPE, next
 *  to a filename that already ended in .pdf. A thumbnail exists so you can
 *  recognise the document before you open it. */
export function DocumentThumbnail({ width = 96 }: { width?: number }) {
  const language = useAtomValue(languageAtom);
  const files = useAtomValue(filesAtom);
  const groups = useAtomValue(documentGroupsAtom);
  const activeGroupId = useAtomValue(activePrimaryGroupIdAtom);

  // The SAME resolution the viewer uses: the active primary group in the current
  // language, falling back to any file in that group. If they disagreed, the
  // thumbnail would show a different document than the one View opens.
  const filePath = useMemo(() => {
    const primary = groups.filter((g) => g.isPrimary).sort((a, b) => a.order - b.order);
    const id = activeGroupId ?? primary[0]?.id ?? null;
    if (!id) return null;
    const exact = files.find((f) => f.groupId === id && f.language === language);
    return (exact ?? files.find((f) => f.groupId === id))?.url ?? null;
  }, [files, groups, activeGroupId, language]);

  const height = Math.round(width * 1.33);
  const box = "hidden md:block shrink-0 rounded";

  const empty = (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-warm text-ink-muted">
      <FileText size={20} strokeWidth={1.5} />
      <span className="text-[9px] uppercase tracking-wider">No preview</span>
    </div>
  );

  if (!filePath) {
    return (
      <div className={box} style={{ width, height, border: "1px solid var(--border-primary)" }}>
        {empty}
      </div>
    );
  }

  return (
    <PdfPageThumb
      url={filePath}
      width={width}
      className={box}
      fallback={empty}
      style={{ width, height, border: "1px solid var(--border-primary)" }}
    />
  );
}
