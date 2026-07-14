import { useMemo, useState } from "react";
import { Document, Page } from "react-pdf";
import { FileText } from "lucide-react";
import { useAtomValue } from "jotai";
import { languageAtom } from "../../atoms/language";
import { filesAtom, documentGroupsAtom, activePrimaryGroupIdAtom } from "../../atoms/files";

/** First page of the entity's actual document, rendered small.
 *
 *  This was a grey box with the word "PDF" in it — a picture of a file type, not
 *  of the file. It sat next to the filename, which already said `.pdf`, so it
 *  carried no information at all. A thumbnail's whole job is to let you recognise
 *  the document before you open it, and page one does that: you see the seal, the
 *  heading, the shape of the thing.
 *
 *  When there IS no document (an entity with no file, or the sample corpus's
 *  placeholder), it falls back to a quiet sheet-of-paper mark rather than
 *  pretending — and the caller (`hasDocument`) decides whether to show it at all. */
export function DocumentThumbnail({ width = 96 }: { width?: number }) {
  const language = useAtomValue(languageAtom);
  const files = useAtomValue(filesAtom);
  const groups = useAtomValue(documentGroupsAtom);
  const activeGroupId = useAtomValue(activePrimaryGroupIdAtom);
  const [failed, setFailed] = useState(false);

  // Same resolution the viewer uses: the active primary group in the current
  // language, falling back to any file in that group. If they disagreed, the
  // thumbnail would show a different document than the one you'd open.
  const filePath = useMemo(() => {
    const primary = groups.filter((g) => g.isPrimary).sort((a, b) => a.order - b.order);
    const id = activeGroupId ?? primary[0]?.id ?? null;
    if (!id) return null;
    const exact = files.find((f) => f.groupId === id && f.language === language);
    return (exact ?? files.find((f) => f.groupId === id))?.url ?? null;
  }, [files, groups, activeGroupId, language]);

  const height = Math.round(width * 1.33);

  const shell = (children: React.ReactNode) => (
    <div
      className="hidden md:flex shrink-0 items-center justify-center overflow-hidden rounded bg-paper"
      style={{ width, height, border: "1px solid var(--border-primary)" }}
    >
      {children}
    </div>
  );

  if (!filePath || failed) {
    return shell(
      <div className="flex flex-col items-center gap-1 text-ink-muted">
        <FileText size={20} strokeWidth={1.5} />
        <span className="text-[9px] uppercase tracking-wider">No preview</span>
      </div>,
    );
  }

  return shell(
    <Document
      file={filePath}
      onLoadError={() => setFailed(true)}
      loading={<div className="w-full h-full bg-warm animate-pulse" />}
      error={<FileText size={20} strokeWidth={1.5} className="text-ink-muted" />}
    >
      <Page
        pageNumber={1}
        width={width}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        loading={<div className="w-full h-full bg-warm animate-pulse" />}
      />
    </Document>,
  );
}
