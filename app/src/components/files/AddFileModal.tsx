import { useEffect, useState } from "react";
import { X, CloudUpload, FileText, Music, Video, Image, Link2, Check } from "lucide-react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  addFileTargetAtom,
  filesAtom,
  documentGroupsAtom,
} from "../../atoms/files";
import { languageAtom } from "../../atoms/language";
import { FileEntry, FileKind, DocumentGroup } from "../../data/files";

interface PendingFile {
  id: string;
  originalName: string;
  /** Editable display name (sans extension; user can change). */
  name: string;
  /** Editable language. Defaults to the languageAtom value. */
  language: string;
  kind: FileKind;
  /** "primary" / "supporting" → new group; "translation" → existing group. */
  addAs:
    | { type: "primary" }
    | { type: "supporting" }
    | { type: "translation"; groupId: string };
  size: string;
  /** 0–1; simulated upload. Once 1, the entry is ready to confirm. */
  progress: number;
}

const typeIcons: Record<FileKind, typeof FileText> = {
  pdf: FileText,
  document: FileText,
  audio: Music,
  video: Video,
  image: Image,
  link: Link2,
};

const knownLanguages = ["EN", "ES", "FR", "AR", "PT", "DE"];

/** Heuristic FileKind from filename extension. */
function detectKind(filename: string): FileKind {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (["mp3", "wav", "m4a", "ogg", "flac"].includes(ext)) return "audio";
  if (["mp4", "mov", "webm", "avi", "mkv"].includes(ext)) return "video";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["docx", "doc", "txt", "md", "rtf"].includes(ext)) return "document";
  return "document";
}

/** Approximate human size for the seeded demo (no real File API behind this). */
const SAMPLE_FILE_NAMES = [
  { name: "Velasquez-Rodriguez_Sentencia.pdf", size: "118 KB" },
  { name: "Velasquez-Rodriguez_Arret.pdf", size: "121 KB" },
  { name: "evidence_photo.jpg", size: "1.6 MB" },
  { name: "hearing_recording.wav", size: "18.7 MB" },
  { name: "press_conference.mp4", size: "84.2 MB" },
  { name: "witness_testimony.pdf", size: "4.1 MB" },
];

export function AddFileModal() {
  const [target, setTarget] = useAtom(addFileTargetAtom);
  const setFiles = useSetAtom(filesAtom);
  const [groups, setGroups] = useAtom(documentGroupsAtom);
  const currentLanguage = useAtomValue(languageAtom);

  const open = target !== null;
  const lockedGroupId = target?.mode === "translation" ? target.groupId : null;
  const lockedGroup = lockedGroupId
    ? groups.find((g) => g.id === lockedGroupId)
    : undefined;

  const [entries, setEntries] = useState<PendingFile[]>([]);

  useEffect(() => {
    if (!open) setEntries([]);
  }, [open]);

  // Simulate upload progress for queued entries.
  useEffect(() => {
    if (!open) return;
    const ticking = entries.filter((e) => e.progress < 1).map((e) => e.id);
    if (ticking.length === 0) return;
    const tickingSet = new Set(ticking);
    const handle = setInterval(() => {
      setEntries((prev) =>
        prev.map((e) =>
          tickingSet.has(e.id) ? { ...e, progress: Math.min(1, e.progress + 0.12) } : e,
        ),
      );
    }, 220);
    return () => clearInterval(handle);
  }, [open, entries]);

  if (!open) return null;

  const addPending = (originalName: string, size?: string) => {
    const kind = detectKind(originalName);
    const baseName = originalName.replace(/\.[^.]+$/, "");
    const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setEntries((prev) => [
      ...prev,
      {
        id,
        originalName,
        name: baseName,
        language: currentLanguage,
        kind,
        addAs: lockedGroupId
          ? { type: "translation", groupId: lockedGroupId }
          : { type: "primary" },
        size: size ?? "—",
        progress: 0,
      },
    ]);
  };

  const simulatePick = () => {
    const sample =
      SAMPLE_FILE_NAMES[Math.floor(Math.random() * SAMPLE_FILE_NAMES.length)];
    addPending(sample.name, sample.size);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dropped = Array.from(e.dataTransfer.files ?? []);
    if (dropped.length === 0) {
      simulatePick();
      return;
    }
    for (const f of dropped) {
      const size = formatBytes(f.size);
      addPending(f.name, size);
    }
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntry = (id: string, patch: Partial<PendingFile>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const allReady = entries.length > 0 && entries.every((e) => e.progress >= 1);

  const confirmAll = () => {
    if (!allReady) return;
    const newGroups: DocumentGroup[] = [];
    const newFiles: FileEntry[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const nextOrder = groups.length > 0
      ? Math.max(...groups.map((g) => g.order)) + 1
      : 0;
    let orderCursor = nextOrder;

    for (const entry of entries) {
      let groupId: string;
      if (entry.addAs.type === "translation") {
        groupId = entry.addAs.groupId;
      } else {
        const newGroupId = `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        newGroups.push({
          id: newGroupId,
          title: entry.name,
          isPrimary: entry.addAs.type === "primary",
          order: orderCursor++,
        });
        groupId = newGroupId;
      }
      const fileId = `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const nameWithExt = entry.name.match(/\.[^.]+$/)
        ? entry.name
        : `${entry.name}${getExtensionFor(entry.kind, entry.originalName)}`;
      newFiles.push({
        id: fileId,
        groupId,
        name: nameWithExt,
        language: entry.language,
        type: entry.kind,
        size: entry.size,
        modified: today,
        url: entry.kind === "pdf" ? "/sample.pdf" : undefined,
      });
    }

    if (newGroups.length > 0) {
      setGroups((all) => [...all, ...newGroups]);
    }
    setFiles((all) => [...all, ...newFiles]);
    setTarget(null);
  };

  const primaryGroups = groups.filter((g) => g.isPrimary);

  return (
    <div
      className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-4 bg-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-file-modal-title"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="bg-paper shadow-xl w-full md:max-w-[36rem] md:rounded-xl md:animate-fade-in-up h-full md:h-auto md:max-h-[90vh] flex flex-col">
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border-primary)" }}
        >
          <h2 id="add-file-modal-title" className="text-base font-semibold text-ink">
            {lockedGroup
              ? `Add translation to "${lockedGroup.title}"`
              : "Add file"}
          </h2>
          <button
            onClick={() => setTarget(null)}
            aria-label="Close"
            className="p-1 rounded-md hover:bg-parchment transition-colors cursor-pointer"
          >
            <X size={18} className="text-ink-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5 space-y-4">
          {/* Dropzone */}
          <button
            type="button"
            onClick={simulatePick}
            className="flex flex-col items-center justify-center w-full py-6 rounded-lg bg-warm hover:bg-parchment transition-colors cursor-pointer"
            style={{ border: "2px dashed var(--border-soft)" }}
          >
            <CloudUpload size={28} className="text-ink-tertiary/50 mb-1.5" />
            <span className="text-sm font-medium text-ink-secondary">
              Click to select files
            </span>
            <span className="text-xs text-ink-muted mt-0.5">
              or drag and drop here
            </span>
          </button>

          {/* Queued entries */}
          {entries.length > 0 && (
            <ul className="space-y-2.5">
              {entries.map((entry) => {
                const Icon = typeIcons[entry.kind];
                return (
                  <li
                    key={entry.id}
                    className="rounded-md bg-warm border border-border/50 p-3 space-y-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <Icon size={16} className="text-ink-muted mt-1 shrink-0" />
                      <input
                        type="text"
                        value={entry.name}
                        onChange={(e) => updateEntry(entry.id, { name: e.target.value })}
                        className="flex-1 min-w-0 px-2 py-1 text-sm text-ink bg-paper border border-border rounded focus:outline-none focus:ring-1 focus:ring-carbon/30"
                        aria-label="Filename"
                      />
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="text-xs text-ink-tertiary hover:text-ink transition-colors cursor-pointer shrink-0 pt-1"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={entry.language}
                        onChange={(e) =>
                          updateEntry(entry.id, { language: e.target.value })
                        }
                        className="w-full px-2 py-1 text-xs text-ink bg-paper border border-border rounded focus:outline-none focus:ring-1 focus:ring-carbon/30"
                        aria-label="Language"
                      >
                        {Array.from(new Set([...knownLanguages, entry.language])).map((l) => (
                          <option key={l} value={l}>
                            Language: {l}
                          </option>
                        ))}
                      </select>

                      <select
                        value={
                          entry.addAs.type === "translation"
                            ? `t:${entry.addAs.groupId}`
                            : entry.addAs.type
                        }
                        disabled={!!lockedGroupId}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "primary") {
                            updateEntry(entry.id, { addAs: { type: "primary" } });
                          } else if (v === "supporting") {
                            updateEntry(entry.id, { addAs: { type: "supporting" } });
                          } else if (v.startsWith("t:")) {
                            updateEntry(entry.id, {
                              addAs: { type: "translation", groupId: v.slice(2) },
                            });
                          }
                        }}
                        className="w-full px-2 py-1 text-xs text-ink bg-paper border border-border rounded focus:outline-none focus:ring-1 focus:ring-carbon/30 disabled:opacity-70"
                        aria-label="Add as"
                      >
                        <option value="primary">Add as: new primary doc</option>
                        <option value="supporting">Add as: supporting file</option>
                        {primaryGroups.map((g) => (
                          <option key={g.id} value={`t:${g.id}`}>
                            Translation of: {g.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded bg-vellum overflow-hidden">
                        <div
                          className="h-full bg-carbon transition-[width] duration-200"
                          style={{ width: `${Math.round(entry.progress * 100)}%` }}
                        />
                      </div>
                      {entry.progress >= 1 ? (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-success">
                          <Check size={11} /> Ready
                        </span>
                      ) : (
                        <span className="text-[10px] text-ink-tertiary tabular-nums">
                          {Math.round(entry.progress * 100)}%
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {entries.length === 0 && (
            <p className="text-xs text-ink-tertiary text-center">
              No files queued yet.
            </p>
          )}
        </div>

        <div
          className="flex justify-end gap-3 px-6 py-4"
          style={{ borderTop: "1px solid var(--border-primary)" }}
        >
          <button
            onClick={() => setTarget(null)}
            className="px-4 py-2 text-sm font-medium rounded-md border border-border text-ink-secondary hover:bg-parchment transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={confirmAll}
            disabled={!allReady}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              allReady
                ? "bg-ink text-parchment hover:bg-ink/90 cursor-pointer"
                : "bg-warm text-ink-muted border border-border cursor-not-allowed"
            }`}
          >
            {entries.length > 1 ? `Add ${entries.length} files` : "Add file"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtensionFor(kind: FileKind, originalName: string): string {
  const match = originalName.match(/\.[^.]+$/);
  if (match) return match[0];
  switch (kind) {
    case "pdf": return ".pdf";
    case "audio": return ".wav";
    case "video": return ".mp4";
    case "image": return ".jpg";
    case "document": return ".docx";
    case "link": return "";
  }
}
