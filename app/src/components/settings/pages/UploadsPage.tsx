import { useState } from "react";
import { formatBytes, uploadUrl } from "../../../atoms/uploads";
import { useAtomValue, useSetAtom } from "jotai";
import { codeDocsAtom } from "../../../atoms/sitePages";
import { nameList } from "../../../utils/settingsUsage";
import { Upload, Image, FileText, Type, File, LayoutGrid, List, Link2 } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActionButton, RowActions } from "../RowActions";
import { Select } from "../../shared/Select";
import { SegmentedControl } from "../../shared/SegmentedControl";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { seedUploads, type SettingsUpload } from "../../../data/settings";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { useNotify } from "../../../hooks/useNotify";

const typeIcon = { image: Image, pdf: FileText, font: Type, other: File };

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "image", label: "Images" },
  { value: "pdf", label: "PDFs" },
  { value: "font", label: "Fonts" },
  { value: "other", label: "Other" },
];

const VIEW_OPTIONS = [
  { id: "grid", label: "Grid", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
];

export function UploadsPage() {
  const notify = useNotify();
  // Pages whose code names the file's URL. Only pages edited in this visit
  // have code in the store; the seeded pages' code is built on open.
  const docs = useAtomValue(codeDocsAtom);
  const uploadUsage = (url: string) => {
    const titles = Object.values(docs)
      .filter((d) => JSON.stringify(d).includes(url))
      .map((d) => d.draft.en.title || "Untitled page");
    return { lines: titles.length ? [`Used in ${nameList(titles)}. Those references will break.`] : [], block: null };
  };
  const { record } = useSettingsNotify();
  const toast = (message: string) => notify(message, "success");

  const [uploads, setUploads] = useState<SettingsUpload[]>(seedUploads);
  const [confirm, setConfirm] = useState<SettingsUpload | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [view, setView] = useState("grid");

  const search = useSettingsSearch(
    typeFilter === "all" ? uploads : uploads.filter((u) => u.kind === typeFilter),
    (u) => `${u.name} ${uploadUrl(u)}`,
  );
  const filtered = search.rows;

  const copyUrl = (u: SettingsUpload) => {
    navigator.clipboard?.writeText(uploadUrl(u)).catch(() => {});
    toast("URL copied");
  };

  const columns: Column<SettingsUpload>[] = [
    {
      id: "name",
      header: "File",
      cell: (u) => {
        const Icon = typeIcon[u.kind];
        return (
          <div className="flex items-center gap-2 min-w-0">
            <Icon size={14} className="text-ink-muted shrink-0" />
            <span className="font-medium text-ink truncate">{u.name}</span>
          </div>
        );
      },
    },
    { id: "url", header: "URL", cell: (u) => <span dir="ltr" className="text-xs text-ink-tertiary truncate">{uploadUrl(u)}</span> },
    { id: "size", header: "Size", width: "7rem", cell: (u) => <span dir="ltr" className="text-xs text-ink-tertiary">{formatBytes(u.size)}</span> },
    {
      id: "actions",
      header: "",
      width: "5rem",
      align: "right",
      cell: (u) => (
        <RowActions label={u.name} onDelete={() => setConfirm(u)}>
          <RowActionButton label={`Copy URL for ${u.name}`} icon={<Link2 size={14} aria-hidden />} onClick={() => copyUrl(u)} />
        </RowActions>
      ),
    },
  ];

  const uploadFile = () => notify("Upload is not built in the prototype. No file was added.", "info");
  const empty = (
    <SettingsEmptyState
      icon={<Upload size={16} />}
      title={typeFilter === "all" ? "No uploads yet" : "No uploads of this type"}
      hint="Upload images, fonts or files to use in pages and custom CSS."
      action={{ label: "Upload file", onClick: uploadFile }}
      query={search.query}
      onClearQuery={search.clear}
    />
  );

  return (
    <SettingsListPage
      component="UploadsPage"
      title="Uploads"
      intro="Assets you can reference from pages, custom CSS, or templates."
      search={{ value: search.query, onChange: search.setQuery, label: "Search uploads", placeholder: "Search by name or URL…" }}
      filters={
        <>
          <Select value={typeFilter} options={TYPE_OPTIONS} onChange={setTypeFilter} ariaLabel="Filter by type" />
          <SegmentedControl value={view} options={VIEW_OPTIONS} onChange={setView} ariaLabel="View mode" />
        </>
      }
      lead={{ label: "Upload file", icon: <Upload size={14} aria-hidden />, onClick: uploadFile }}
      overlays={
        <ConfirmDelete
          open={confirm !== null}
          impact={confirm ? uploadUsage(uploadUrl(confirm)) : null}
          title="Delete upload"
          message={`Delete “${confirm?.name}”?`}
          confirmLabel="Delete"
          onConfirm={() => {
            if (confirm) {
              setUploads((prev) => prev.filter((u) => u.id !== confirm.id));
              record({ log: false,  method: "DELETE", domain: "upload", noun: "file", id: confirm.id, name: confirm.name });
            }
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      }
    >
      {view === "grid" ? (
        filtered.length === 0 ? (
          <div className="rounded-lg py-10 border border-border-soft">{empty}</div>
        ) : (
          <ul data-part="assets" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((u) => {
              const Icon = typeIcon[u.kind];
              return (
                <li
                  key={u.id}
                  data-part="asset"
                  className="group flex flex-col rounded-lg bg-paper overflow-hidden border border-border"
                >
                  {/* Thumbnail (placeholder — no real images) */}
                  <div className="flex items-center justify-center aspect-[4/3] bg-warm">
                    <Icon size={28} className="text-ink-muted" />
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <span className="text-sm font-medium text-ink truncate" title={u.name}>{u.name}</span>
                    <span className="text-xs text-ink-tertiary" dir="ltr">{formatBytes(u.size)}</span>
                    <div className="flex items-center gap-1 mt-1.5">
                      <button
                        onClick={() => copyUrl(u)}
                        aria-label={`Copy URL for ${u.name}`}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium text-ink-secondary hover:bg-warm hover:text-ink transition-colors cursor-pointer"
                      >
                        <Link2 size={13} />
                        Copy URL
                      </button>
                      <div className="ms-auto">
                        <RowActions label={u.name} onDelete={() => setConfirm(u)} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <SettingsTable columns={columns} data={filtered} getRowId={(u) => u.id} emptyState={empty} />
      )}
    </SettingsListPage>
  );
}
