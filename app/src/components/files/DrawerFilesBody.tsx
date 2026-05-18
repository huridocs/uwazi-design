import { ChevronRight } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { FileEntry } from "../../data/files";
import {
  filesAtom,
  documentGroupsAtom,
  activePrimaryGroupIdAtom,
  addFileTargetAtom,
} from "../../atoms/files";
import { languageAtom } from "../../atoms/language";
import { AddFileModal } from "./AddFileModal";

/** Drawer body listing every file grouped by its DocumentGroup. Mirrors the
 *  main Files view layout: one section per primary group with its
 *  translations beneath, then a flat Supporting files section. Used by both
 *  the Document tab drawer and the Metadata tab drawer so the file UI is
 *  consistent everywhere. */
export function DrawerFilesBody() {
  const files = useAtomValue(filesAtom);
  const groups = useAtomValue(documentGroupsAtom);
  const activeGroupId = useAtomValue(activePrimaryGroupIdAtom);
  const language = useAtomValue(languageAtom);
  const setAddFileTarget = useSetAtom(addFileTargetAtom);

  const primaryGroups = [...groups]
    .filter((g) => g.isPrimary)
    .sort((a, b) => a.order - b.order);
  const resolvedActiveId = activeGroupId ?? primaryGroups[0]?.id ?? null;
  const isInActivePrimary = (file: FileEntry) =>
    file.groupId === resolvedActiveId && file.language === language;

  const supportingGroupIds = new Set(
    groups.filter((g) => !g.isPrimary).map((g) => g.id),
  );
  const supportingFiles = files.filter((f) => supportingGroupIds.has(f.groupId));

  return (
    <>
      <div className="flex-1 overflow-auto px-3 py-4 pb-8">
        {primaryGroups.length > 0 && (
          <SectionHeader label="Primary documents" />
        )}
        {primaryGroups.map((group) => {
          const groupFiles = files.filter((f) => f.groupId === group.id);
          return (
            <section key={group.id} className="mb-6">
              <div className="flex items-baseline justify-between px-1 mb-2">
                <h4 className="text-sm font-semibold text-ink truncate">
                  {group.title}
                </h4>
                <span className="text-[10px] text-ink-tertiary tabular-nums shrink-0">
                  {groupFiles.length} {groupFiles.length === 1 ? "file" : "files"}
                </span>
              </div>
              <div className="space-y-2">
                {groupFiles.map((file) => (
                  <DrawerFileRow
                    key={file.id}
                    filename={file.name}
                    type={file.type.toUpperCase()}
                    size={file.size}
                    language={file.language}
                    active={isInActivePrimary(file)}
                    thumbnail={<FileThumbnail type={file.type} />}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setAddFileTarget({ mode: "translation", groupId: group.id })
                }
                className="text-[11px] font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer mt-2 pl-1"
              >
                + Add translation
              </button>
            </section>
          );
        })}

        {supportingFiles.length > 0 && (
          <>
            <SectionHeader label="Supporting files" />
            <div className="space-y-2 mt-2">
              {supportingFiles.map((file) => (
                <DrawerFileRow
                  key={file.id}
                  filename={file.name}
                  type={file.type.toUpperCase()}
                  size={file.size}
                  language={file.language}
                  thumbnail={<FileThumbnail type={file.type} />}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div
        className="flex items-center gap-3 h-12 px-3 bg-paper shrink-0"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <button
          onClick={() => setAddFileTarget({ mode: "new" })}
          className="px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors cursor-pointer"
        >
          Add file
        </button>
        <span className="text-xs text-ink-muted">
          Learn more about <span className="font-bold underline">files</span>
        </span>
      </div>
      <AddFileModal />
    </>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <h3 className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider px-1 mb-3">
      {label}
    </h3>
  );
}

interface DrawerFileRowProps {
  filename: string;
  type: string;
  size: string;
  language: string;
  active?: boolean;
  thumbnail: React.ReactNode;
}

function FileThumbnail({ type }: { type: FileEntry["type"] }) {
  const wrap =
    "w-16 self-stretch flex items-center justify-center rounded-l-md shrink-0";
  if (type === "link") {
    return (
      <div className={`${wrap} bg-seal`}>
        <span className="text-[9px] font-bold text-white">YouTube</span>
      </div>
    );
  }
  if (type === "audio") {
    return (
      <div className={`${wrap} bg-warm`}>
        <div className="w-8 h-8 rounded-md bg-parchment flex items-center justify-center shadow-sm">
          <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[7px] border-l-ink ml-0.5" />
        </div>
      </div>
    );
  }
  if (type === "video") {
    return (
      <div className={`${wrap} bg-ink`}>
        <div className="w-8 h-8 rounded-full bg-paper/95 flex items-center justify-center shadow-sm">
          <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-ink ml-0.5" />
        </div>
      </div>
    );
  }
  if (type === "image") {
    return (
      <div className={`${wrap} bg-vellum`}>
        <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-tertiary">
          IMG
        </span>
      </div>
    );
  }
  return (
    <div className={`${wrap} bg-warm`}>
      <div
        className="bg-paper rounded shadow-sm flex items-center justify-center"
        style={{ width: "2.25rem", height: "2.75rem" }}
      >
        <span className="text-[8px] text-ink-muted">
          {type === "pdf" ? "PDF" : "DOC"}
        </span>
      </div>
    </div>
  );
}

function DrawerFileRow({
  filename,
  type,
  size,
  language,
  active,
  thumbnail,
}: DrawerFileRowProps) {
  return (
    <div
      className={`flex items-stretch border rounded-md overflow-hidden transition-colors min-h-[58px] ${
        active
          ? "border-ink/30 bg-parchment hover:bg-parchment"
          : "border-border/50 bg-paper hover:bg-warm/50"
      }`}
    >
      {thumbnail}

      <div className="flex-1 min-w-0 px-3 py-2 flex flex-col justify-center gap-0.5">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-ink truncate">{filename}</p>
          <span className="text-[9px] font-semibold text-ink-secondary bg-vellum px-1 py-px rounded shrink-0">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-ink-tertiary">{type}</span>
          <span className="text-[10px] text-ink-tertiary">{size}</span>
        </div>
      </div>

      <div className="flex items-center pr-2 shrink-0">
        <button className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-ink rounded border border-border hover:bg-warm transition-colors cursor-pointer">
          <ChevronRight size={11} /> View
        </button>
      </div>
    </div>
  );
}
