import { useEffect, useRef, useState } from "react";
import { SectionLabel } from "../shared/SectionLabel";
import { MasonryGrid, MasonryItem } from "../metadata/MasonryGrid";
import { MetadataCard } from "../metadata/MetadataCard";
import {
  FileText,
  Music,
  Video,
  Image,
  Link2,
  ChevronDown,
  Pencil,
  Check,
  Trash2,
} from "lucide-react";
import { useAtom, useAtomValue } from "jotai";
import { FileEntry, FileKind } from "../../data/files";
import {
  filesAtom,
  documentGroupsAtom,
  drawerEditFocusAtom,
} from "../../atoms/files";
import { languageAtom, languageName } from "../../atoms/language";
import { formatFileDate } from "../../utils/dates";

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
  const groups = useAtomValue(documentGroupsAtom);
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

  const Icon = typeIcons[file.type];

  // Allow ad-hoc languages (anything seeded in the file goes into the picker).
  const languageOptions = Array.from(
    new Set([...knownLanguages, file.language, language]),
  );

  return (
    <>
      {/* No warm panel around the band any more: the cards carry their own
          edges, and a filled box around bordered boxes is the "boxed-in
          compartment" the border tokens were lightened to avoid. The section
          label heads the band, as it does in the metadata record. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionLabel as="h4" level="section">
            File details
          </SectionLabel>
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className={`flex items-center gap-1 px-2 py-0.5 text-meta font-medium rounded transition-colors cursor-pointer ${
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

        {/* The same record the metadata surfaces render: one bordered
            MetadataCard per property, 11px uppercase head over a 14px value, in
            the same container-query masonry at the same gutter. A file's
            details ARE a record; they only looked like a different kind of
            thing because they were written as one.

            ORDER, and a file has no template to read it from, so it is chosen:
            NAME first, because it is what the file is called and the only field
            a reader scans for. Then what the file IS at a glance — TYPE and
            SIZE, facts about the artefact, then LANGUAGE, which is the one that
            distinguishes THIS file from its siblings in the same document
            group, so it sits last in that band and next to the Document section
            that lists them. Then MODIFIED, because a date is what you check
            after you have identified the thing, not before.

            EDITABILITY IS UNCHANGED. Name and Language were the editable pair
            and still are; Type, Size and Modified are derived from the file and
            were never editable, so they render as values. An input keeps its
            border, its background and its focus ring inside the card, so an
            editable field never reads as static text. */}
        <MasonryGrid>
          <MasonryItem>
            <MetadataCard title="Name">
              {editing ? (
                <div className="flex items-center gap-2 bg-paper rounded-md border border-border focus-within:ring-2 focus-within:ring-carbon/20 focus-within:border-carbon/40 transition-shadow">
                  <Icon size={14} className="text-ink-muted ml-2 shrink-0" />
                  <input
                    ref={nameRef}
                    key={file.id}
                    type="text"
                    defaultValue={file.name}
                    onBlur={(e) => updateField("name", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        (e.target as HTMLInputElement).blur();
                    }}
                    className="flex-1 min-w-0 px-1 py-1.5 text-sm text-ink bg-transparent focus:outline-none"
                    aria-label="File name"
                  />
                </div>
              ) : (
                <span className="flex items-center gap-2 min-w-0 text-sm font-medium leading-relaxed text-ink">
                  <Icon size={14} className="text-ink-muted shrink-0" />
                  <span className="truncate">{file.name}</span>
                </span>
              )}
            </MetadataCard>
          </MasonryItem>

          <MasonryItem>
            <MetadataCard title="Type">
              <span className="flex items-center gap-1.5 text-sm font-medium leading-relaxed text-ink">
                <Icon size={14} className="text-ink-muted shrink-0" />
                {typeLabels[file.type]}
              </span>
            </MetadataCard>
          </MasonryItem>

          <MasonryItem>
            <MetadataCard title="Size">
              <span
                dir="ltr"
                className="text-sm font-medium leading-relaxed text-ink"
              >
                {file.size}
              </span>
            </MetadataCard>
          </MasonryItem>

          <MasonryItem>
            <MetadataCard title="Language">
              {editing ? (
                <div className="relative inline-flex items-center bg-paper rounded-md border border-border focus-within:ring-2 focus-within:ring-carbon/20 focus-within:border-carbon/40 transition-shadow">
                  <select
                    ref={langRef}
                    value={file.language}
                    onChange={(e) => updateField("language", e.target.value)}
                    className="appearance-none bg-transparent pl-2 pr-6 py-1.5 text-sm font-medium text-ink focus:outline-none cursor-pointer"
                    aria-label="File language"
                  >
                    {/* Named, not coded: this is a chooser, and a reader picking
                        a file's language should see the language. Codes this app
                        has no name for (PT, DE, the "—" for none) fall back to
                        themselves — see `languageName`. */}
                    {languageOptions.map((lang) => (
                      <option key={lang} value={lang}>
                        {languageName(lang)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={11}
                    className="absolute right-1.5 text-ink-tertiary pointer-events-none"
                  />
                </div>
              ) : (
                <span className="text-sm font-medium leading-relaxed text-ink">
                  {languageName(file.language)}
                </span>
              )}
            </MetadataCard>
          </MasonryItem>

          <MasonryItem>
            <MetadataCard title="Modified">
              <span
                dir="ltr"
                className="text-sm font-medium leading-relaxed text-ink"
              >
                {formatFileDate(file.modified)}
              </span>
            </MetadataCard>
          </MasonryItem>
        </MasonryGrid>
      </div>

      {group && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionLabel as="h4" level="section">
              Document
            </SectionLabel>
            <span
              className={`px-1.5 py-0.5 text-meta font-medium rounded ${
                group.isPrimary
                  ? "bg-warning-light text-warning"
                  : "bg-vellum text-ink-secondary"
              }`}
            >
              {group.isPrimary ? "Primary" : "Supporting"}
            </span>
          </div>

          <MasonryGrid>
            <MasonryItem>
              <MetadataCard title="Title">
                <span className="text-sm font-medium leading-relaxed text-ink">
                  {group.title}
                </span>
              </MetadataCard>
            </MasonryItem>
            {translations.length > 1 && (
              <MasonryItem>
                {/* A set of siblings is a chip field, and the record already has
                    a shape for one: a card, one column, chips wrapping inside. */}
                <MetadataCard title="Translations">
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
                          <span
                            className="text-meta font-semibold text-ink-secondary bg-vellum px-1 rounded"
                            title={languageName(t.language)}
                            aria-label={languageName(t.language)}
                          >
                            {t.language}
                          </span>
                          <span className="text-xs text-ink truncate max-w-[180px]">
                            {t.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </MetadataCard>
              </MasonryItem>
            )}
          </MasonryGrid>

          {/* A file's role is fixed at upload (see AddFileModal) — there is no
              promote / demote / set-active here any more, so the only action
              left on a document group is adding a language to it. */}
          {group.isPrimary && (
            <div className="flex items-center pt-1">
              <button
                type="button"
                onClick={() => onAddTranslation?.(group.id)}
                className="ml-auto text-meta font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer"
              >
                + Add translation
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end pt-1">
        <button
          type="button"
          onClick={() => onRequestDelete(file.id)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-meta font-medium text-seal-label rounded hover:bg-seal-tint transition-colors cursor-pointer"
        >
          <Trash2 size={12} /> Delete file
        </button>
      </div>
    </>
  );
}
