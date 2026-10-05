import { useId, useMemo, useRef, useState, type DragEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Upload, Image, FileText, Type, File, LayoutGrid, List, Link2, Trash2, X, CloudUpload } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActionButton, RowActions } from "../RowActions";
import { Select } from "../../shared/Select";
import { SegmentedControl } from "../../shared/SegmentedControl";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "../../shared/Modal";
import { MODAL_INPUT, ModalField, ModalSectionLabel } from "../../shared/ModalParts";
import { BAR_GHOST } from "../../shared/warmButton";
import { Dropzone } from "../../shared/Dropzone";
import { type SettingsUpload } from "../../../data/settings";
import { formatBytes, uploads as uploadsStore, uploadsAtom, uploadUrl } from "../../../atoms/uploads";
import { sitePagesAtom, pageTitle } from "../../../atoms/sitePages";
import { customisationSettings } from "../../../atoms/settingsSingletons";
import { breakpointAtom } from "../../../atoms/viewport";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { useNotify } from "../../../hooks/useNotify";
import { useUploadFiles, UPLOAD_LIMIT_LABEL } from "../../../hooks/useUploadFiles";
import { nameList } from "../../../utils/settingsUsage";
import type { SortDir } from "../../shared/DataTable";

const typeIcon = { image: Image, pdf: FileText, font: Type, other: File };

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "image", label: "Images" },
  { value: "pdf", label: "PDFs" },
  { value: "font", label: "Fonts" },
  { value: "other", label: "Other" },
];

const VIEW_OPTIONS = [
  { id: "list", label: "List", icon: List },
  { id: "grid", label: "Grid", icon: LayoutGrid },
];

/** A file's preview: the image itself, or its type's icon. The box has its
 *  size before the image loads. */
function Thumb({ u, size }: { u: SettingsUpload; size: "row" | "card" }) {
  const Icon = typeIcon[u.kind];
  const box = size === "row" ? "w-10 h-10 rounded-md" : "w-full aspect-[4/3]";
  return (
    <span data-part="thumb" className={`${box} shrink-0 flex items-center justify-center overflow-hidden bg-warm`}>
      {u.src ? (
        <img src={u.src} alt="" className={size === "row" ? "w-full h-full object-cover" : "max-w-full max-h-full object-contain"} />
      ) : (
        <Icon size={size === "row" ? 16 : 28} className="text-ink-muted" aria-hidden />
      )}
    </span>
  );
}

/** Split "logo.svg" into its editable stem and the extension Uwazi keeps. */
const splitName = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? { stem: name.slice(0, dot), ext: name.slice(dot) } : { stem: name, ext: "" };
};

export function UploadsPage() {
  const notify = useNotify();
  const { record } = useSettingsNotify();
  const upload = useUploadFiles();
  const phone = useAtomValue(breakpointAtom) === "mobile";
  const list = useAtomValue(uploadsAtom);
  const remove = useSetAtom(uploadsStore.deleteAtom);
  const patch = useSetAtom(uploadsStore.patchAtom);

  // What references a file: a page's code in any language, or Global CSS & JS.
  const pages = useAtomValue(sitePagesAtom);
  const custom = useAtomValue(customisationSettings.valueAtom);
  const usageOf = (u: SettingsUpload) => {
    const url = uploadUrl(u);
    const titles = pages
      .filter((p) =>
        [p.doc.draft, p.doc.published].some(
          (locs) => !!locs && Object.values(locs).some((l) => `${l.html}\n${l.css}\n${l.js}`.includes(url)),
        ),
      )
      .map(pageTitle);
    if (custom.css.includes(url)) titles.push("Global CSS");
    if (custom.js.includes(url)) titles.push("Global JS");
    return titles;
  };

  const [confirm, setConfirm] = useState<SettingsUpload[] | null>(null);
  const [editing, setEditing] = useState<SettingsUpload | null>(null);
  const [importing, setImporting] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [view, setView] = useState("list");
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | undefined>(undefined);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);

  const search = useSettingsSearch(
    typeFilter === "all" ? list : list.filter((u) => u.kind === typeFilter),
    (u) => `${u.name} ${uploadUrl(u)}`,
  );
  const rows = useMemo(() => {
    if (!sort) return search.rows;
    const sorted = [...search.rows].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return sort.dir === "asc" ? sorted : sorted.reverse();
  }, [search.rows, sort]);
  // A ticked row the filters hide is not part of the selection.
  const ticked = rows.filter((u) => selected.has(u.id));

  const copyUrl = (u: SettingsUpload) => {
    const url = uploadUrl(u);
    const done = () => notify(`URL copied: ${url}`, "success");
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, () => notify("The URL could not be copied.", "error"));
    else notify("The URL could not be copied.", "error");
  };

  const deleteFiles = (files: SettingsUpload[]) => {
    for (const u of files) {
      remove({ id: u.id });
      record({ method: "DELETE", domain: "upload", noun: "file", id: u.id, name: u.name, summary: `Deleted file “${u.name}”`, notify: false });
    }
    notify("Deleted custom file", "success");
    setSelected((s) => new Set([...s].filter((id) => !files.some((f) => f.id === id))));
    setConfirm(null);
  };

  const rename = (u: SettingsUpload, name: string) => {
    patch({ id: u.id, patch: { name } });
    record({ method: "UPDATE", domain: "upload", noun: "file", id: u.id, name, summary: `Updated file “${name}”`, message: "File updated" });
    setEditing(null);
  };

  const actions = (u: SettingsUpload) => (
    <RowActions label={u.name} onEdit={() => setEditing(u)} onDelete={() => setConfirm([u])}>
      <RowActionButton label={`Copy URL for ${u.name}`} icon={<Link2 size={14} aria-hidden />} onClick={() => copyUrl(u)} />
    </RowActions>
  );

  const columns: Column<SettingsUpload>[] = phone
    ? [
        {
          id: "name",
          header: "Name",
          cell: (u) => (
            <div className="flex items-center gap-3 min-w-0">
              <Thumb u={u} size="row" />
              <span className="min-w-0 flex flex-col">
                <span className="font-medium text-ink truncate">{u.name}</span>
                <span dir="ltr" className="text-xs text-ink-tertiary truncate">{uploadUrl(u)}</span>
              </span>
            </div>
          ),
        },
        { id: "actions", header: "Action", cell: actions },
      ]
    : [
        { id: "preview", header: "Preview", width: "4rem", cell: (u) => <Thumb u={u} size="row" /> },
        {
          id: "name",
          header: "Name",
          sortKey: "name",
          cell: (u) => <span className="font-medium text-ink truncate">{u.name}</span>,
        },
        {
          id: "url",
          header: "URL",
          cell: (u) => <span dir="ltr" className="text-xs text-ink-tertiary truncate">{uploadUrl(u)}</span>,
        },
        { id: "actions", header: "Action", width: "7rem", align: "right", cell: actions },
      ];

  const empty = (
    <SettingsEmptyState
      icon={<Upload size={16} />}
      title={typeFilter === "all" ? "No uploads yet" : "No uploads of this type"}
      hint="Upload images, fonts or files to use in pages and custom CSS."
      action={{ label: "Import asset", onClick: () => setImporting(true) }}
      query={search.query}
      onClearQuery={search.clear}
      noMatchTitle={(q) => `No uploads match “${q}”`}
    />
  );

  // The whole page takes a dropped file, as Add would.
  const dropProps = {
    onDragOver: (e: DragEvent) => {
      if (importing || !e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      setDragOver(true);
    },
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
    },
    onDrop: (e: DragEvent) => {
      if (importing) return;
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length) void upload(files);
    },
  };

  const usage = confirm?.map((u) => ({ u, used: usageOf(u) })) ?? [];
  const anyUsed = usage.some((x) => x.used.length > 0);

  return (
    <SettingsListPage
      component="UploadsPage"
      title="Uploads"
      intro="Assets you can reference from pages and custom CSS. A&nbsp;file's URL stays the same when you rename it."
      search={{ value: search.query, onChange: search.setQuery, label: "Search uploads", placeholder: "Search by name or URL…" }}
      filters={
        <>
          <Select value={typeFilter} options={TYPE_OPTIONS} onChange={setTypeFilter} ariaLabel="Filter by type" />
          <SegmentedControl value={view} options={VIEW_OPTIONS} onChange={setView} ariaLabel="View mode" />
        </>
      }
      lead={{ label: "Import asset", icon: <Upload size={14} aria-hidden />, onClick: () => setImporting(true) }}
      selection={{
        count: ticked.length,
        total: rows.length,
        onClear: () => setSelected(new Set()),
        actions: [{ id: "delete", label: "Delete", icon: <Trash2 size={13} />, danger: true, onClick: () => setConfirm(ticked) }],
      }}
      overlays={
        <>
          {importing && (
            <ImportAssetModal
              onClose={() => setImporting(false)}
              onAdd={(files) => {
                setImporting(false);
                void upload(files);
              }}
            />
          )}
          {editing && <EditFileModal file={editing} onClose={() => setEditing(null)} onSave={(name) => rename(editing, name)} />}
          <ConfirmDelete
            open={confirm !== null}
            impact={null}
            title="Delete"
            message="Do you want to delete the following items?"
            confirmLabel="Delete"
            onConfirm={() => confirm && deleteFiles(confirm)}
            onCancel={() => setConfirm(null)}
          >
            <ul data-part="items" className="flex flex-col gap-2">
              {usage.map(({ u, used }) => (
                <li key={u.id} className="flex flex-col gap-0.5 text-sm">
                  <span className="flex gap-2 text-ink">
                    <span aria-hidden className="mt-[0.5rem] w-1 h-1 rounded-full bg-ink-muted shrink-0" />
                    {u.name}
                  </span>
                  {used.length > 0 && (
                    <span className="ps-3 text-xs text-ink-secondary">Used in {nameList(used)}</span>
                  )}
                </li>
              ))}
            </ul>
            <p data-part="effect" className="mt-3 text-xs text-ink-secondary text-pretty">
              {anyUsed
                ? "Those pages and styles keep their references, which will point to a missing file."
                : "Nothing references these files. Nothing else changes."}
            </p>
          </ConfirmDelete>
        </>
      }
    >
      <div {...dropProps} data-part="drop-area" className="relative flex flex-col min-h-[12rem]">
        {view === "grid" ? (
          rows.length === 0 ? (
            <div className="rounded-lg py-10 border border-border-soft">{empty}</div>
          ) : (
            <ul data-part="assets" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {rows.map((u) => (
                <li key={u.id} data-part="asset" className="group flex flex-col rounded-lg bg-paper overflow-hidden border border-border">
                  <Thumb u={u} size="card" />
                  <div className="flex flex-col gap-1 p-3 min-w-0">
                    <span className="text-sm font-medium text-ink truncate" title={u.name}>
                      {u.name}
                    </span>
                    <span className="text-xs text-ink-tertiary truncate" dir="ltr">
                      {uploadUrl(u)}
                    </span>
                    <div className="mt-1">{actions(u)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <SettingsTable
            columns={columns}
            data={rows}
            getRowId={(u) => u.id}
            emptyState={empty}
            sort={sort}
            onSort={(key) => setSort((s) => ({ key, dir: s?.key === key && s.dir === "asc" ? "desc" : "asc" }))}
            selection={{ selected, onChange: setSelected, label: (u) => u.name }}
          />
        )}
        {dragOver && (
          <div
            data-part="drop-target"
            aria-hidden
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-parchment/90 pointer-events-none"
            style={{ border: "2px dashed var(--border-primary)" }}
          >
            <CloudUpload size={28} className="text-ink-tertiary" />
            <span className="text-sm font-medium text-ink">Drop files to upload</span>
          </div>
        )}
      </div>
    </SettingsListPage>
  );
}

/** "Import asset": pick or drop several files, see them listed, Add. */
function ImportAssetModal({ onClose, onAdd }: { onClose: () => void; onAdd: (files: File[]) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const labelId = useId();
  const add = (more: File[]) => setFiles((prev) => [...prev, ...more]);
  return (
    <Modal
      component="ImportAssetModal"
      size="md"
      onClose={onClose}
      title="Import asset"
      footer={
        <>
          <button type="button" onClick={onClose} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            Cancel
          </button>
          <button
            type="button"
            onClick={files.length ? () => onAdd(files) : undefined}
            aria-disabled={!files.length || undefined}
            className={files.length ? MODAL_COMMIT : MODAL_COMMIT_DISABLED}
          >
            Add
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <span id={labelId} className="sr-only">
          Files to import
        </span>
        <Dropzone
          multiple
          accept="*/*"
          onFiles={add}
          title="Browse files to upload"
          hint={`or drop your files here. Up to ${UPLOAD_LIMIT_LABEL} each.`}
          labelledBy={labelId}
        />
        <ul data-part="chosen" aria-label="Files to import" className="flex flex-col gap-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 px-3 py-2 rounded-md bg-warm text-sm">
              <span className="min-w-0 flex-1 truncate text-ink">{f.name}</span>
              <span dir="ltr" className="text-xs text-ink-tertiary tabular-nums">
                {formatBytes(f.size)}
              </span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                className="p-1 rounded-md text-ink-tertiary hover:text-ink hover:bg-parchment cursor-pointer"
              >
                <X size={13} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

/** Uwazi's "Edit File" panel: the display name without its extension. The
 *  URL is the stored file name and does not change. */
function EditFileModal({ file, onClose, onSave }: { file: SettingsUpload; onClose: () => void; onSave: (name: string) => void }) {
  const { stem, ext } = splitName(file.name);
  const [value, setValue] = useState(stem);
  const [tried, setTried] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const msgId = useId();
  const missing = !value.trim();
  const save = () => {
    setTried(true);
    if (missing) {
      input.current?.focus();
      return;
    }
    onSave(`${value.trim()}${ext}`);
  };
  return (
    <Modal
      component="EditFileModal"
      size="sm"
      onClose={onClose}
      title="Edit File"
      footer={
        <>
          <button type="button" onClick={onClose} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            Cancel
          </button>
          <button type="button" onClick={save} className={MODAL_COMMIT}>
            Save
          </button>
        </>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <ModalSectionLabel>General Information</ModalSectionLabel>
        <ModalField label="File name" htmlFor={id}>
          <div className="flex items-center gap-2">
            <input
              ref={input}
              id={id}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={(tried && missing) || undefined}
              aria-describedby={msgId}
              autoComplete="off"
              className={`${MODAL_INPUT} flex-1 ${tried && missing ? "border-seal" : ""}`}
            />
            {ext && (
              <span dir="ltr" className="text-xs text-ink-tertiary">
                {ext}
              </span>
            )}
          </div>
          <p id={msgId} className="min-h-4 text-meta text-seal-label">
            {tried && missing ? "This field is required" : ""}
          </p>
        </ModalField>
        <p className="text-xs text-ink-tertiary">
          URL{" "}
          <span dir="ltr" className="font-mono">
            {uploadUrl(file)}
          </span>{" "}
          stays the same.
        </p>
      </form>
    </Modal>
  );
}
