import { useEffect, useRef } from "react";
import {
  FileText,
  Music,
  Video,
  Image,
  Link2,
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronDown,
  Eye,
  Trash2,
} from "lucide-react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { FileEntry, FileKind } from "../../data/files";
import {
  filesAtom,
  documentGroupsAtom,
  activePrimaryGroupIdAtom,
  drawerEditFocusAtom,
} from "../../atoms/files";
import { languageAtom } from "../../atoms/language";

const typeIcons: Record<FileKind, typeof FileText> = {
  pdf: FileText,
  document: FileText,
  audio: Music,
  video: Video,
  image: Image,
  link: Link2,
};

const typeLabels: Record<FileKind, string> = {
  pdf: "PDF",
  document: "Document",
  audio: "Audio",
  video: "Video",
  image: "Image",
  link: "Link",
};

const knownLanguages = ["EN", "ES", "FR", "AR", "PT", "DE", "—"];

interface FileDetailEditorProps {
  file: FileEntry;
  onRequestDelete: (id: string) => void;
  onAddTranslation?: (groupId: string) => void;
  onFocusSibling?: (id: string) => void;
}

/** Drawer detail body for a single focused file. Every field is live-editable
 *  against `filesAtom`. The "Group" section also exposes promote/demote on
 *  the parent `DocumentGroup` and a chip row of sibling translations. */
export function FileDetailEditor({
  file,
  onRequestDelete,
  onAddTranslation,
  onFocusSibling,
}: FileDetailEditorProps) {
  const [files, setFiles] = useAtom(filesAtom);
  const [groups, setGroups] = useAtom(documentGroupsAtom);
  const activeGroupId = useAtomValue(activePrimaryGroupIdAtom);
  const setActiveGroupId = useSetAtom(activePrimaryGroupIdAtom);
  const [editFocus, setEditFocus] = useAtom(drawerEditFocusAtom);
  const language = useAtomValue(languageAtom);

  const nameRef = useRef<HTMLInputElement>(null);
  const langRef = useRef<HTMLSelectElement>(null);

  const group = groups.find((g) => g.id === file.groupId);
  const siblings = files.filter(
    (f) => f.groupId === file.groupId && f.id !== file.id,
  );

  // Honour the one-shot focus signal from kebab "Rename" / "Change language".
  useEffect(() => {
    if (!editFocus) return;
    if (editFocus === "name") {
      nameRef.current?.focus();
      nameRef.current?.select();
    } else if (editFocus === "language") {
      langRef.current?.focus();
    }
    setEditFocus(null);
  }, [editFocus, setEditFocus]);

  const updateField = <K extends keyof FileEntry>(
    field: K,
    value: FileEntry[K],
  ) => {
    setFiles((all) =>
      all.map((f) => (f.id === file.id ? { ...f, [field]: value } : f)),
    );
  };

  const promoteOrDemote = () => {
    if (!group) return;
    setGroups((all) =>
      all.map((g) =>
        g.id === group.id ? { ...g, isPrimary: !g.isPrimary } : g,
      ),
    );
  };

  const setAsActive = () => {
    setActiveGroupId(file.groupId);
  };

  const isActiveGroup = file.groupId === activeGroupId;
  const Icon = typeIcons[file.type];

  // Allow ad-hoc languages (anything seeded in the file goes into the picker).
  const languageOptions = Array.from(
    new Set([...knownLanguages, file.language, language]),
  );

  return (
    <>
      <div className="rounded-md bg-warm p-4 space-y-3">
        <h4 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
          File details
        </h4>

        <Field label="Name">
          <div className="flex items-center gap-2 bg-paper rounded border border-border focus-within:ring-1 focus-within:ring-carbon/30">
            <Icon size={14} className="text-ink-muted ml-2 shrink-0" />
            <input
              ref={nameRef}
              type="text"
              defaultValue={file.name}
              onBlur={(e) => updateField("name", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="flex-1 min-w-0 px-1 py-1.5 text-sm text-ink bg-transparent focus:outline-none"
              aria-label="File name"
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Language">
            <div className="relative inline-flex items-center bg-paper border border-border rounded focus-within:ring-1 focus-within:ring-carbon/30">
              <select
                ref={langRef}
                value={file.language}
                onChange={(e) => updateField("language", e.target.value)}
                className="appearance-none bg-transparent pl-2 pr-6 py-1.5 text-sm text-ink focus:outline-none cursor-pointer"
                aria-label="File language"
              >
                {languageOptions.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-1.5 text-ink-tertiary pointer-events-none"
              />
            </div>
          </Field>

          <Field label="Type">
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-ink-secondary">
              <Icon size={14} className="text-ink-muted shrink-0" />
              <span>{typeLabels[file.type]}</span>
            </div>
          </Field>

          <Field label="Size">
            <span className="text-sm text-ink-secondary">{file.size}</span>
          </Field>

          <Field label="Modified">
            <span className="text-sm text-ink-secondary">
              {new Date(file.modified).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </Field>
        </div>
      </div>

      {group && (
        <div className="rounded-md bg-warm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
              Document
            </h4>
            <span
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                group.isPrimary
                  ? isActiveGroup
                    ? "bg-ink text-parchment"
                    : "bg-warning-light text-warning"
                  : "bg-vellum text-ink-secondary"
              }`}
            >
              {group.isPrimary ? (isActiveGroup ? "Active primary" : "Primary") : "Supporting"}
            </span>
          </div>

          <p className="text-sm font-medium text-ink">{group.title}</p>

          {siblings.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wide">
                Translations
              </p>
              <div className="flex flex-wrap gap-1.5">
                {siblings.map((sib) => (
                  <button
                    key={sib.id}
                    type="button"
                    onClick={() => onFocusSibling?.(sib.id)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-paper border border-border hover:bg-parchment transition-colors cursor-pointer"
                  >
                    <span className="text-[10px] font-semibold text-ink-secondary bg-vellum px-1 rounded">
                      {sib.language}
                    </span>
                    <span className="text-xs text-ink truncate max-w-[180px]">
                      {sib.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={promoteOrDemote}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-ink rounded border border-border hover:bg-paper transition-colors cursor-pointer"
            >
              {group.isPrimary ? (
                <>
                  <ArrowDownCircle size={12} /> Demote to supporting
                </>
              ) : (
                <>
                  <ArrowUpCircle size={12} /> Promote to primary
                </>
              )}
            </button>
            {group.isPrimary && !isActiveGroup && (
              <button
                type="button"
                onClick={setAsActive}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-ink rounded border border-border hover:bg-paper transition-colors cursor-pointer"
              >
                <Eye size={12} /> Set as active
              </button>
            )}
            {group.isPrimary && (
              <button
                type="button"
                onClick={() => onAddTranslation?.(group.id)}
                className="ml-auto text-[11px] font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer"
              >
                + Add translation
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end pt-1">
        <button
          type="button"
          onClick={() => onRequestDelete(file.id)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-seal rounded hover:bg-seal-tint transition-colors cursor-pointer"
        >
          <Trash2 size={12} /> Delete file
        </button>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-medium text-ink-muted uppercase tracking-wide">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}
