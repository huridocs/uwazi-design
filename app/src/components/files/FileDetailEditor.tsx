import { useEffect, useRef, useState } from "react";
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
  Pencil,
  Check,
  Trash2,
} from "lucide-react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { FileEntry, FileKind } from "../../data/files";
import {
  filesAtom,
  documentGroupsAtom,
  activePrimaryGroupIdAtom,
  setActivePrimaryAtom,
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
  const setActivePrimary = useSetAtom(setActivePrimaryAtom);
  const [editFocus, setEditFocus] = useAtom(drawerEditFocusAtom);
  const language = useAtomValue(languageAtom);

  const nameRef = useRef<HTMLInputElement>(null);
  const langRef = useRef<HTMLSelectElement>(null);

  // Edit mode — name + language fall back to read-only labels unless the
  // user explicitly clicks Edit. Reset whenever the focused file changes so
  // switching to a different row drops out of edit on the previous one.
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    setEditing(false);
  }, [file.id]);

  const group = groups.find((g) => g.id === file.groupId);
  // Every translation in the group, including the focused one. Hiding the
  // focused one shifted positions on every selection — chips appeared to
  // jump around. Keep them all visible; highlight the current.
  const translations = files.filter((f) => f.groupId === file.groupId);

  // Honour the one-shot focus signal from kebab "Rename" / "Change language".
  // Flip into edit mode + focus the relevant field once mounted.
  useEffect(() => {
    if (!editFocus) return;
    setEditing(true);
    requestAnimationFrame(() => {
      if (editFocus === "name") {
        nameRef.current?.focus();
        nameRef.current?.select();
      } else if (editFocus === "language") {
        langRef.current?.focus();
      }
      setEditFocus(null);
    });
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
    setActivePrimary(file.groupId);
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
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
            File details
          </h4>
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
              editing
                ? "bg-ink text-parchment hover:bg-ink/90"
                : "text-ink-secondary hover:bg-paper hover:text-ink"
            }`}
            aria-pressed={editing}
          >
            {editing ? (
              <>
                <Check size={11} /> Done
              </>
            ) : (
              <>
                <Pencil size={11} className="text-ink-tertiary" /> Edit
              </>
            )}
          </button>
        </div>

        <Field label="Name">
          {editing ? (
            <div className="flex items-center gap-2 bg-paper rounded border border-border focus-within:ring-1 focus-within:ring-carbon/30">
              <Icon size={14} className="text-ink-muted ml-2 shrink-0" />
              <input
                ref={nameRef}
                key={file.id}
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
          ) : (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Icon size={14} className="text-ink-muted shrink-0" />
              <span className="text-sm text-ink truncate">{file.name}</span>
            </div>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Language">
            {editing ? (
              <div className="relative inline-flex items-center bg-paper rounded border border-border focus-within:ring-1 focus-within:ring-carbon/30">
                <select
                  ref={langRef}
                  value={file.language}
                  onChange={(e) => updateField("language", e.target.value)}
                  className="appearance-none bg-transparent pl-2 pr-6 py-0.5 text-xs font-medium text-ink focus:outline-none cursor-pointer"
                  aria-label="File language"
                >
                  {languageOptions.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={11}
                  className="absolute right-1.5 text-ink-tertiary pointer-events-none"
                />
              </div>
            ) : (
              <span className="inline-block px-2 py-0.5 text-xs font-medium text-ink-secondary bg-vellum rounded">
                {file.language}
              </span>
            )}
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

          {translations.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wide">
                Translations
              </p>
              <div className="flex flex-wrap gap-1.5">
                {translations.map((t) => {
                  const current = t.id === file.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => !current && onFocusSibling?.(t.id)}
                      aria-current={current ? "true" : undefined}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-colors ${
                        current
                          ? "bg-parchment border-ink/30 cursor-default"
                          : "bg-paper border-border hover:bg-parchment cursor-pointer"
                      }`}
                    >
                      <span className="text-[10px] font-semibold text-ink-secondary bg-vellum px-1 rounded">
                        {t.language}
                      </span>
                      <span className="text-xs text-ink truncate max-w-[180px]">
                        {t.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={promoteOrDemote}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-ink-secondary bg-paper hover:bg-parchment hover:text-ink rounded transition-colors cursor-pointer"
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
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-ink-secondary bg-paper hover:bg-parchment hover:text-ink rounded transition-colors cursor-pointer"
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
