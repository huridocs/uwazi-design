import { useState } from "react";
import { CloudUpload, Plus } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  filesAtom,
  documentGroupsAtom,
  addFileTargetAtom,
} from "../../atoms/files";
import { languageAtom } from "../../atoms/language";
import { FileKind } from "../../data/files";

interface AddFileDropAreaProps {
  /** "large" for empty-state hero zone; "compact" for the bottom-of-list
   *  always-visible affordance. */
  variant?: "large" | "compact";
  /** When set, dropped files attach to this DocumentGroup as translations
   *  rather than creating new supporting groups. The "pick a file" button
   *  opens the modal in translation mode for the same group. */
  targetGroupId?: string;
  /** Called with the newly-created focused file id so the parent can update
   *  selection. */
  onAdded?: (fileId: string) => void;
}

function detectKind(filename: string): FileKind {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (["mp3", "wav", "m4a", "ogg", "flac"].includes(ext)) return "audio";
  if (["mp4", "mov", "webm", "avi", "mkv"].includes(ext)) return "video";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  return "document";
}

/** Inline drop zone for the Files tab. Dropping bypasses the AddFileModal:
 *  each dropped file lands as a new supporting group at the bottom. The
 *  affordance also offers a "+ More options" button that opens the full
 *  modal for users who need to pick primary / translation / etc. */
export function AddFileDropArea({
  variant = "compact",
  targetGroupId,
  onAdded,
}: AddFileDropAreaProps) {
  const setFiles = useSetAtom(filesAtom);
  const setGroups = useSetAtom(documentGroupsAtom);
  const groups = useAtomValue(documentGroupsAtom);
  const language = useAtomValue(languageAtom);
  const setTarget = useSetAtom(addFileTargetAtom);
  const [dragging, setDragging] = useState(false);

  const nextOrder = groups.length > 0
    ? Math.max(...groups.map((g) => g.order)) + 1
    : 0;

  const addOne = (filename: string, size: string, kind: FileKind) => {
    const fileId = `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    // Translation drop: attach to the target group, no new group created.
    if (targetGroupId) {
      setFiles((all) => [
        ...all,
        {
          id: fileId,
          groupId: targetGroupId,
          name: filename,
          language,
          type: kind,
          size,
          modified: new Date().toISOString().slice(0, 10),
          url:
            kind === "pdf"
              ? "/docs/Velasquez-Rodriguez_v_Honduras_Judgment_1988_EN.pdf"
              : undefined,
        },
      ]);
      onAdded?.(fileId);
      return;
    }
    // Regular drop: spawn a new supporting group containing this file.
    const groupId = `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const base = filename.replace(/\.[^.]+$/, "");
    setGroups((all) => [
      ...all,
      { id: groupId, title: base, isPrimary: false, order: nextOrder },
    ]);
    setFiles((all) => [
      ...all,
      {
        id: fileId,
        groupId,
        name: filename,
        language,
        type: kind,
        size,
        modified: new Date().toISOString().slice(0, 10),
        url: kind === "pdf" ? "/sample.pdf" : undefined,
      },
    ]);
    onAdded?.(fileId);
  };

  /** Click → open AddFileModal so the user can actually see what they're
   *  adding (and edit name / language / add-as) before committing. Dropping
   *  files bypasses the modal because the user already picked them. */
  const openPicker = () =>
    setTarget(
      targetGroupId
        ? { mode: "translation", groupId: targetGroupId }
        : { mode: "new" },
    );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files ?? []);
    if (dropped.length === 0) {
      openPicker();
      return;
    }
    for (const f of dropped) {
      const sizeStr =
        f.size < 1024
          ? `${f.size} B`
          : f.size < 1024 * 1024
            ? `${(f.size / 1024).toFixed(1)} KB`
            : `${(f.size / (1024 * 1024)).toFixed(1)} MB`;
      addOne(f.name, sizeStr, detectKind(f.name));
    }
  };

  const ringClass = dragging
    ? "border-ink/40 bg-paper"
    : "border-border-soft hover:border-ink/20 hover:bg-paper";

  if (variant === "large") {
    return (
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-md py-12 transition-colors ${ringClass}`}
        style={{ border: "2px dashed var(--border-soft)" }}
      >
        <CloudUpload size={36} className="text-ink-tertiary/40" />
        <p className="text-sm font-medium text-ink-secondary">
          Drag files here or click to add
        </p>
        <button
          type="button"
          onClick={openPicker}
          className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
        >
          Pick a file
        </button>
      </div>
    );
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex items-center justify-center gap-3 rounded-md py-3 transition-colors mt-3 ${ringClass}`}
      style={{ border: "1.5px dashed var(--border-soft)" }}
    >
      <Plus size={14} className="text-ink-muted" />
      <span className="text-xs text-ink-muted">
        {dragging ? "Drop to add" : "Drag a file here, or"}
      </span>
      <button
        type="button"
        onClick={openPicker}
        className="text-xs font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer"
      >
        pick a file
      </button>
    </div>
  );
}
