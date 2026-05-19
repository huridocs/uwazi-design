import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Music,
  Video,
  Image,
  Link2,
  Eye,
  MoreVertical,
  Pencil,
  Languages,
  ArrowUpCircle,
  ArrowDownCircle,
  Star,
  Plus,
  Trash2,
} from "lucide-react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { FileEntry } from "../../data/files";
import { breakpointAtom } from "../../atoms/viewport";
import {
  documentGroupsAtom,
  activePrimaryGroupIdAtom,
  setActivePrimaryAtom,
  drawerEditFocusAtom,
  viewerFileIdAtom,
} from "../../atoms/files";
import { Checkbox } from "../shared/Checkbox";

interface FileTableProps {
  files: FileEntry[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  focusedId?: string | null;
  onFocus?: (id: string) => void;
  /** Invoked by the kebab "Delete" action; opens a confirmation upstream. */
  onRequestDelete: (id: string) => void;
  /** Invoked by the kebab "Add translation" action; opens AddFileModal
   *  (commit 4) pre-filled with the file's group. */
  onAddTranslation?: (groupId: string) => void;
  /** When true, hide the inner table's section header so a wrapper like
   *  DocumentGroupCard can provide its own. */
  embedded?: boolean;
}

const typeIcons: Record<FileEntry["type"], typeof FileText> = {
  pdf: FileText,
  audio: Music,
  video: Video,
  image: Image,
  link: Link2,
  document: FileText,
};

const typeLabels: Record<FileEntry["type"], string> = {
  pdf: "PDF",
  audio: "Audio",
  video: "Video",
  image: "Image",
  link: "Link",
  document: "Document",
};

export function FileTable({
  files,
  selectedIds,
  onSelect,
  onSelectAll,
  focusedId,
  onFocus,
  onRequestDelete,
  onAddTranslation,
  embedded = false,
}: FileTableProps) {
  const allSelected = files.length > 0 && files.every((f) => selectedIds.has(f.id));
  const [breakpoint] = useAtom(breakpointAtom);
  const isMobile = breakpoint === "mobile";
  const groups = useAtomValue(documentGroupsAtom);
  const [activeGroupId] = useAtom(activePrimaryGroupIdAtom);
  const setActivePrimary = useSetAtom(setActivePrimaryAtom);
  const setGroups = useSetAtom(documentGroupsAtom);
  const setDrawerFocus = useSetAtom(drawerEditFocusAtom);
  const setViewerFileId = useSetAtom(viewerFileIdAtom);

  /** Map of groupId → isPrimary, looked up per row to label badges. */
  const isPrimaryByGroup = new Map(groups.map((g) => [g.id, g.isPrimary]));

  const resolvedActiveGroupId =
    activeGroupId ??
    groups
      .filter((g) => g.isPrimary)
      .sort((a, b) => a.order - b.order)[0]?.id ??
    null;

  const promoteOrDemote = (groupId: string, makePrimary: boolean) => {
    setGroups((all) =>
      all.map((g) => (g.id === groupId ? { ...g, isPrimary: makePrimary } : g)),
    );
  };

  const renderMenu = (file: FileEntry) => {
    const isPrimary = isPrimaryByGroup.get(file.groupId) ?? false;
    const isActiveGroup = file.groupId === resolvedActiveGroupId;
    return (
      <RowKebab
        items={[
          {
            id: "view",
            label: "View",
            icon: Eye,
            onClick: () => {
              onFocus?.(file.id);
              setViewerFileId(file.id);
            },
          },
          {
            id: "rename",
            label: "Rename",
            icon: Pencil,
            onClick: () => {
              onFocus?.(file.id);
              setDrawerFocus("name");
            },
          },
          {
            id: "language",
            label: "Change language",
            icon: Languages,
            onClick: () => {
              onFocus?.(file.id);
              setDrawerFocus("language");
            },
          },
          isPrimary
            ? {
                id: "demote",
                label: "Demote to supporting",
                icon: ArrowDownCircle,
                onClick: () => promoteOrDemote(file.groupId, false),
              }
            : {
                id: "promote",
                label: "Promote to primary",
                icon: ArrowUpCircle,
                onClick: () => promoteOrDemote(file.groupId, true),
              },
          isPrimary && !isActiveGroup
            ? {
                id: "activate",
                label: "Set as active primary",
                icon: Star,
                onClick: () => setActivePrimary(file.groupId),
              }
            : null,
          isPrimary
            ? {
                id: "add-translation",
                label: "Add translation",
                icon: Plus,
                onClick: () => onAddTranslation?.(file.groupId),
              }
            : null,
          { id: "sep", separator: true },
          {
            id: "delete",
            label: "Delete",
            icon: Trash2,
            danger: true,
            onClick: () => onRequestDelete(file.id),
          },
        ].filter(Boolean) as KebabItem[]}
      />
    );
  };

  // No per-row pill: the section header (Primary documents / Supporting files)
  // and the DocumentGroupCard's own Active indicator already say everything
  // a Primary/Active row could.
  const renderBadge = (_file: FileEntry) => null;

  if (isMobile) {
    return (
      <div
        className="rounded-md overflow-hidden bg-paper"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" }}
      >
        {files.map((file) => {
          const isSelected = selectedIds.has(file.id);
          const isFocused = focusedId === file.id;
          const Icon = typeIcons[file.type];
          return (
            <div
              key={file.id}
              role="button"
              tabIndex={0}
              onClick={() => onFocus?.(file.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFocus?.(file.id); } }}
              className={`flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-warm ${isFocused ? "bg-parchment" : ""}`}
              style={{
                borderBottom: "1px solid var(--border-primary)",
              }}
            >
              <label className="flex items-center pt-0.5" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onChange={() => onSelect(file.id)}
                  ariaLabel={`Select ${file.name}`}
                />
              </label>
              <Icon size={16} className="text-ink-muted shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-ink truncate">{file.name}</span>
                  {renderBadge(file)}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-ink-tertiary">
                  <span>{typeLabels[file.type]}</span>
                  <span>•</span>
                  <span>{file.size}</span>
                  <span>•</span>
                  <span>{file.language}</span>
                </div>
                <div className="text-[10px] text-ink-muted mt-0.5">
                  {new Date(file.modified).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                {renderMenu(file)}
              </div>
            </div>
          );
        })}
        {!embedded && (
          <div
            className="flex items-center justify-between px-3 h-10 text-xs text-ink-muted"
            style={{ backgroundColor: "var(--bg-warm)", borderTop: "1px solid var(--border-primary)" }}
          >
            <span>{files.length} files</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-md overflow-hidden bg-paper"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="grid items-center gap-3 px-4 h-10 text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider"
        style={{
          gridTemplateColumns: "28px 1fr 70px 70px 50px 90px 32px",
          backgroundColor: "var(--bg-warm)",
          borderBottom: "1px solid var(--border-primary)",
        }}
      >
        <label className="flex items-center justify-center">
          <Checkbox
            checked={allSelected}
            onChange={onSelectAll}
            ariaLabel="Select all files"
          />
        </label>
        <span>File name</span>
        <span>Type</span>
        <span>Size</span>
        <span>Lang</span>
        <span>Modified</span>
        <span>Action</span>
      </div>

      {/* Rows */}
      {files.map((file) => {
        const isSelected = selectedIds.has(file.id);
        const isFocused = focusedId === file.id;
        const Icon = typeIcons[file.type];

        return (
          <div
            key={file.id}
            role="row"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFocus?.(file.id); } }}
            className={`grid items-center gap-3 px-4 h-11 text-sm transition-colors cursor-pointer
              hover:bg-warm ${isFocused ? "bg-parchment" : ""}`}
            style={{
              gridTemplateColumns: "28px 1fr 70px 70px 50px 90px 32px",
              borderBottom: "1px solid var(--border-primary)",
            }}
            onClick={() => onFocus?.(file.id)}
          >
            <label className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onChange={() => onSelect(file.id)}
                ariaLabel={`Select ${file.name}`}
              />
            </label>

            <div className="flex items-center gap-2 min-w-0">
              <Icon size={14} className="text-ink-muted shrink-0" />
              <span className="text-xs font-medium text-ink truncate">{file.name}</span>
              {renderBadge(file)}
            </div>

            <span className="text-xs text-ink-tertiary">{typeLabels[file.type]}</span>
            <span className="text-xs text-ink-tertiary">{file.size}</span>
            <span className="text-xs text-ink-tertiary">{file.language}</span>
            <span className="text-xs text-ink-tertiary">
              {new Date(file.modified).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <div
              className="flex items-center justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              {renderMenu(file)}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      {!embedded && (
        <div
          className="flex items-center justify-between px-4 h-10 text-xs text-ink-muted"
          style={{
            backgroundColor: "var(--bg-warm)",
            borderTop: "1px solid var(--border-primary)",
          }}
        >
          <span>{files.length} files</span>
        </div>
      )}
    </div>
  );
}

// ---------- Kebab menu ----------

interface KebabItemAction {
  id: string;
  label: string;
  icon: typeof Pencil;
  onClick: () => void;
  danger?: boolean;
  separator?: never;
}
interface KebabSeparator {
  id: string;
  separator: true;
  label?: never;
  icon?: never;
  onClick?: never;
  danger?: never;
}
type KebabItem = KebabItemAction | KebabSeparator;

function RowKebab({ items }: { items: KebabItem[] }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Portal-positioned: measure the trigger and place the menu in viewport
  // coords. Avoids being clipped by FileTable's rounded `overflow-hidden`.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const measure = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = 220;
      const menuHeight = menuRef.current?.offsetHeight ?? 240;
      const margin = 8;
      let top = rect.bottom + 4;
      // Flip up if it would overflow the viewport bottom.
      if (top + menuHeight > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - menuHeight - 4);
      }
      let left = rect.right - menuWidth;
      if (left < margin) left = margin;
      if (left + menuWidth > window.innerWidth - margin) {
        left = window.innerWidth - menuWidth - margin;
      }
      setPos({ top, left });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Row actions"
        className="flex items-center justify-center p-1 rounded hover:bg-parchment transition-colors"
      >
        <MoreVertical size={14} className="text-ink-tertiary" />
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 min-w-[220px] rounded-md bg-paper shadow-xl py-1 animate-fade-in-up"
          style={{
            top: pos.top,
            left: pos.left,
            border: "1px solid var(--border-primary)",
          }}
        >
          {items.map((item) =>
            item.separator ? (
              <div
                key={item.id}
                className="my-1 mx-2 h-px"
                style={{ backgroundColor: "var(--border-soft)" }}
                role="separator"
              />
            ) : (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick();
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                  item.danger
                    ? "text-seal hover:bg-seal-tint"
                    : "text-ink-secondary hover:bg-warm"
                }`}
              >
                <item.icon size={12} className="shrink-0" />
                {item.label}
              </button>
            ),
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
