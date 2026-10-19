import { useRef, useState, type DragEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Upload } from "lucide-react";
import { dataSourceAtom } from "../../atoms/dataSource";
import { uploadFilesAtom } from "../../atoms/fileUploads";
import { templateMirror } from "../../data/templates/mirror";
import { uploadTemplateId } from "../../utils/createEntity";
import { dragHasFiles, droppedFiles } from "../../utils/pickFiles";

/** Files dragged over the Library pane: the whole pane becomes the drop
 *  target. Every file of the drop is taken, folders walked, and queued as
 *  Upload does (Uwazi's dropzone takes only the first).
 *
 *  The handlers go on the pane's root, which must be `relative`; the overlay
 *  is drawn inside it. Drags that carry no files (text, a card) pass, and so
 *  do drags over a `data-drop-owner` box, which handles its own drop. */
export function useLibraryDrop() {
  const [over, setOver] = useState(false);
  // enter/leave fire for every child crossed; the pane is left when the
  // count is back to zero.
  const depth = useRef(0);
  const upload = useSetAtom(uploadFilesAtom);
  const handlers = {
    onDragEnter: (e: DragEvent) => {
      if (!dragHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      depth.current += 1;
      setOver(true);
    },
    onDragOver: (e: DragEvent) => {
      if (!dragHasFiles(e.dataTransfer)) return;
      // A box that takes files for itself (a new entity's Files section in a
      // rail panel): the pane's overlay steps aside while the pointer is on it.
      if ((e.target as Element).closest?.("[data-drop-owner]")) {
        setOver(false);
        return;
      }
      setOver(true);
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e: DragEvent) => {
      if (!dragHasFiles(e.dataTransfer)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    },
    onDrop: (e: DragEvent) => {
      if (!dragHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      void droppedFiles(e.dataTransfer).then((picked) => picked.length && upload(picked));
    },
  };
  return { handlers, overlay: over ? <DropOverlay /> : null };
}

function DropOverlay() {
  const corpus = useAtomValue(dataSourceAtom);
  const template = templateMirror(corpus, uploadTemplateId(corpus))?.name;
  return (
    <div
      data-component="LibraryDropTarget"
      // The drag events belong to the pane under it.
      className="pointer-events-none absolute inset-0 z-50 flex p-3 bg-paper/80"
      role="status"
      aria-live="polite"
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ink/25 bg-warm text-center px-6">
        <Upload size={24} className="text-ink-tertiary" aria-hidden />
        <p className="text-sm font-semibold text-ink">Drop to upload</p>
        <p className="text-xs text-ink-tertiary text-pretty max-w-[28rem]">
          Files and folders of any type. Each file becomes an entity{template ? <> in {template}</> : null}, titled from its
          filename.
        </p>
      </div>
    </div>
  );
}
